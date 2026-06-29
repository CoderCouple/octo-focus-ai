import AVFoundation
import CoreMedia
import Darwin
import Foundation
import ScreenCaptureKit

// MARK: - Configuration -------------------------------------------------------

/// Target format for the downstream Deepgram pipeline. Deepgram's
/// `nova-2-meeting` model accepts linear16 PCM at 16 kHz mono very
/// happily and that's what most ASR engines normalise to anyway.
private let kTargetSampleRate: Double = 16_000
private let kTargetChannels: AVAudioChannelCount = 1
private let kBitsPerSample: AVAudioCommonFormat = .pcmFormatInt16

/// Frame buffer size emitted to stdout. ~100 ms at 16 kHz = 1600
/// samples × 2 bytes = 3200 bytes per write. Small enough that
/// Deepgram receives near-realtime updates; large enough that we
/// don't drown the IPC bridge in tiny writes.
private let kEmitFrameSize: AVAudioFrameCount = 1600

// MARK: - Diagnostics ---------------------------------------------------------

/// stdout is the audio pipe; everything human-readable goes to stderr
/// so the parent Electron process can log it without corrupting the
/// audio stream.
private func log(_ message: String) {
    FileHandle.standardError.write(Data("[mac-audio-capture] \(message)\n".utf8))
}

private func fail(_ message: String, code: Int32 = 1) -> Never {
    log("FATAL: \(message)")
    exit(code)
}

// MARK: - Output ring buffer --------------------------------------------------

/// Single-writer thread-safety: ScreenCaptureKit and AVAudioEngine
/// each call back on their own queues. We funnel both into a serial
/// queue that owns the mix + the stdout write.
private final class MixedOutputSink {
    private let queue = DispatchQueue(label: "ai.octofocus.mac-audio-capture.sink")
    private var pendingSamples: [Int16] = []
    private let pendingSamplesLock = NSLock()

    /// Append a chunk of int16 PCM. When we've accumulated >= one
    /// emit frame, drain the buffer to stdout.
    func append(_ samples: [Int16]) {
        pendingSamplesLock.lock()
        pendingSamples.append(contentsOf: samples)
        let shouldFlush = pendingSamples.count >= Int(kEmitFrameSize)
        pendingSamplesLock.unlock()
        if shouldFlush {
            queue.async { [weak self] in self?.flush() }
        }
    }

    /// Mix a chunk of mic audio with whatever's pending from system
    /// audio. Simple sample-by-sample sum, clamped to int16 range —
    /// good enough for speech, no DSP needed.
    func appendMixing(mic: [Int16], system: [Int16]) {
        // (Currently unused; the simpler `append` path is preferred —
        // we add both streams independently and let the buffer
        // interleave them. Kept here as a placeholder for v2 if the
        // additive-mix sounds cleaner than serial append.)
        let count = max(mic.count, system.count)
        var mixed = [Int16](repeating: 0, count: count)
        for i in 0..<count {
            let a = i < mic.count ? Int32(mic[i]) : 0
            let b = i < system.count ? Int32(system[i]) : 0
            let sum = a + b
            mixed[i] = Int16(max(Int32(Int16.min), min(Int32(Int16.max), sum)))
        }
        append(mixed)
    }

    private func flush() {
        var toWrite: [Int16] = []
        pendingSamplesLock.lock()
        if pendingSamples.count >= Int(kEmitFrameSize) {
            let take = min(pendingSamples.count, Int(kEmitFrameSize))
            toWrite = Array(pendingSamples.prefix(take))
            pendingSamples.removeFirst(take)
        }
        pendingSamplesLock.unlock()

        if !toWrite.isEmpty {
            let data = toWrite.withUnsafeBufferPointer { Data(buffer: $0) }
            FileHandle.standardOutput.write(data)
        }
    }
}

// MARK: - Audio conversion helpers --------------------------------------------

/// Convert an arbitrary AVAudioPCMBuffer (whatever the source gave us
/// — 48 kHz stereo float for the mic, 48 kHz stereo float for system
/// audio) to our int16 16 kHz mono target. Uses AVAudioConverter,
/// which handles rate conversion + channel mix-down in one shot.
private func convertToTargetPCM(
    _ buffer: AVAudioPCMBuffer,
    converter: AVAudioConverter,
    outputFormat: AVAudioFormat
) -> [Int16]? {
    let outCapacity = AVAudioFrameCount(
        Double(buffer.frameLength) * outputFormat.sampleRate / buffer.format.sampleRate
    ) + 64
    guard let outBuffer = AVAudioPCMBuffer(
        pcmFormat: outputFormat,
        frameCapacity: outCapacity
    ) else { return nil }

    var error: NSError?
    var done = false
    let status = converter.convert(to: outBuffer, error: &error) { _, outStatus in
        if done {
            outStatus.pointee = .endOfStream
            return nil
        }
        done = true
        outStatus.pointee = .haveData
        return buffer
    }

    if status == .error || error != nil {
        log("converter error: \(error?.localizedDescription ?? "unknown")")
        return nil
    }

    let frames = Int(outBuffer.frameLength)
    guard frames > 0, let ch = outBuffer.int16ChannelData else { return [] }
    let ptr = ch.pointee
    var samples = [Int16](repeating: 0, count: frames)
    for i in 0..<frames { samples[i] = ptr[i] }
    return samples
}

// MARK: - SCStream output handler --------------------------------------------

private final class SystemAudioReceiver: NSObject, SCStreamOutput {
    let sink: MixedOutputSink
    let targetFormat: AVAudioFormat
    var converterCache: AVAudioConverter?
    var sourceFormatCache: AVAudioFormat?

    init(sink: MixedOutputSink, targetFormat: AVAudioFormat) {
        self.sink = sink
        self.targetFormat = targetFormat
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        guard type == .audio, sampleBuffer.dataReadiness == .ready else { return }

        // Pull the source format off the first sample buffer we see;
        // it doesn't change across the stream lifetime.
        if sourceFormatCache == nil {
            guard
                let desc = sampleBuffer.formatDescription,
                let asbdPtr = CMAudioFormatDescriptionGetStreamBasicDescription(desc),
                let fmt = AVAudioFormat(streamDescription: asbdPtr)
            else {
                log("could not derive source format from sample buffer")
                return
            }
            sourceFormatCache = fmt
            converterCache = AVAudioConverter(from: fmt, to: targetFormat)
        }

        guard let sourceFormat = sourceFormatCache, let converter = converterCache else { return }

        // CMSampleBuffer -> AVAudioPCMBuffer copy
        let frameLength = AVAudioFrameCount(CMSampleBufferGetNumSamples(sampleBuffer))
        guard let pcmBuffer = AVAudioPCMBuffer(
            pcmFormat: sourceFormat,
            frameCapacity: frameLength
        ) else { return }
        pcmBuffer.frameLength = frameLength

        let audioBufferList = pcmBuffer.mutableAudioBufferList
        var blockBuffer: CMBlockBuffer?
        let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sampleBuffer,
            bufferListSizeNeededOut: nil,
            bufferListOut: audioBufferList,
            bufferListSize: MemoryLayout<AudioBufferList>.size,
            blockBufferAllocator: nil,
            blockBufferMemoryAllocator: nil,
            flags: 0,
            blockBufferOut: &blockBuffer
        )
        if status != noErr { return }

        if let samples = convertToTargetPCM(
            pcmBuffer,
            converter: converter,
            outputFormat: targetFormat
        ) {
            sink.append(samples)
        }
    }
}

// MARK: - Capture orchestration -----------------------------------------------

@MainActor
private func runCapture() async {
    // Target output format: 16 kHz mono int16. All converters target
    // this.
    guard let targetFormat = AVAudioFormat(
        commonFormat: kBitsPerSample,
        sampleRate: kTargetSampleRate,
        channels: kTargetChannels,
        interleaved: true
    ) else {
        fail("could not construct target PCM format")
    }

    let sink = MixedOutputSink()

    // -- SCStream setup (system audio) ----------------------------------------
    log("requesting shareable content…")
    let content: SCShareableContent
    do {
        content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: false
        )
    } catch {
        fail("failed to enumerate shareable content: \(error). Did you grant Screen Recording permission?")
    }

    guard let display = content.displays.first else {
        fail("no displays available for capture")
    }

    let filter = SCContentFilter(
        display: display,
        excludingApplications: [],
        exceptingWindows: []
    )

    let config = SCStreamConfiguration()
    config.capturesAudio = true
    config.excludesCurrentProcessAudio = true
    config.sampleRate = 48_000
    config.channelCount = 2
    // We're not actually consuming video, but ScreenCaptureKit insists
    // on a valid video config. Make it the cheapest possible.
    config.width = 2
    config.height = 2
    config.minimumFrameInterval = CMTime(value: 1, timescale: 1)

    let stream = SCStream(filter: filter, configuration: config, delegate: nil)
    let receiver = SystemAudioReceiver(sink: sink, targetFormat: targetFormat)
    do {
        try stream.addStreamOutput(
            receiver,
            type: .audio,
            sampleHandlerQueue: DispatchQueue(label: "ai.octofocus.sc.audio")
        )
    } catch {
        fail("addStreamOutput failed: \(error)")
    }

    // -- AVAudioEngine setup (mic) --------------------------------------------
    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    let inputFormat = inputNode.inputFormat(forBus: 0)
    let micConverter = AVAudioConverter(from: inputFormat, to: targetFormat)
    inputNode.installTap(
        onBus: 0,
        bufferSize: 1024,
        format: inputFormat
    ) { buffer, _ in
        guard let conv = micConverter else { return }
        if let samples = convertToTargetPCM(
            buffer,
            converter: conv,
            outputFormat: targetFormat
        ) {
            sink.append(samples)
        }
    }

    // -- Start everything -----------------------------------------------------
    log("starting capture…")
    do {
        try engine.start()
    } catch {
        fail("AVAudioEngine.start: \(error)")
    }

    do {
        try await stream.startCapture()
    } catch {
        fail("SCStream.startCapture: \(error). Grant Screen Recording permission in System Settings → Privacy & Security.")
    }

    log("running. PID=\(getpid()) — write any line to stdin to stop.")

    // -- Stop signals ---------------------------------------------------------
    // Parent process closes our stdin when it wants us to exit; we
    // also handle SIGINT / SIGTERM for direct invocation testing.
    let stopSemaphore = DispatchSemaphore(value: 0)

    DispatchQueue.global(qos: .utility).async {
        // Block on stdin read until EOF — that's our "stop" signal.
        _ = FileHandle.standardInput.availableData
        while true {
            let data = FileHandle.standardInput.availableData
            if data.isEmpty { break } // EOF
        }
        stopSemaphore.signal()
    }

    let signalSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global())
    signalSource.setEventHandler { stopSemaphore.signal() }
    signalSource.resume()

    let intSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .global())
    intSource.setEventHandler { stopSemaphore.signal() }
    intSource.resume()

    DispatchQueue.global().async {
        stopSemaphore.wait()
        Task { @MainActor in
            log("stopping…")
            do {
                try await stream.stopCapture()
            } catch {
                log("stopCapture: \(error)")
            }
            engine.stop()
            inputNode.removeTap(onBus: 0)
            FileHandle.standardOutput.synchronizeFile()
            exit(0)
        }
    }

    // Keep the run loop alive. The async stopSemaphore.wait above
    // ultimately calls exit(0) for us.
    RunLoop.main.run()
}

// MARK: - Entry --------------------------------------------------------------

Task { @MainActor in
    await runCapture()
}
RunLoop.main.run()
