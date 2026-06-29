// swift-tools-version:5.9
import PackageDescription

/**
 * Standalone Swift executable that ScreenCaptureKit-captures system
 * audio + the default mic, mixes both into a single 16 kHz mono
 * 16-bit-PCM stream, and writes the raw samples to stdout in 100 ms
 * frames. Designed to be spawned as a child process by the Electron
 * main process; the renderer reads the chunks from the IPC bridge
 * and forwards them to Deepgram.
 *
 * Deployment target is macOS 13 — `SCStreamConfiguration.capturesAudio`
 * is the modern audio-loopback path (no Loopback / BlackHole virtual
 * device required).
 */
let package = Package(
    name: "mac-audio-capture",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "MacAudioCapture",
            path: "Sources/MacAudioCapture"
        )
    ]
)
