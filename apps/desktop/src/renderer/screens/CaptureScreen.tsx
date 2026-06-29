/**
 * Live capture screen — the meeting listener proper. Two capture
 * sources, chosen at start time:
 *
 *   - **Sidecar (Mac, default)**: the Swift `mac-audio-capture`
 *     binary runs in the Electron main process and emits 16kHz mono
 *     int16 PCM frames over IPC. We forward each frame to Deepgram
 *     (linear16) and append to a flat PCM buffer for upload as WAV.
 *
 *   - **Browser fallback (mic-only)**: `getUserMedia` +
 *     `MediaRecorder` (webm/opus). Used when the sidecar binary
 *     isn't available (non-Mac, dev build without `swift build`,
 *     permission denied). Captures the user's mic only.
 *
 * Flow:
 *   1. Try sidecar. On failure, fall back to MediaRecorder.
 *   2. Each audio chunk feeds Deepgram (live transcript) AND the
 *      local upload buffer in parallel.
 *   3. Stop: drain pipelines, upload final audio + PATCH transcript,
 *      kick off Claude summarize, render the summary.
 */
import { useEffect, useRef, useState } from "react";
import { patchMeeting, summarizeMeeting, uploadMeetingAudio } from "../lib/api";
import { connectDeepgram, type DeepgramHandle } from "../lib/deepgram";
import { wrapPcmAsWav } from "../lib/wav";

interface CaptureScreenProps {
  meetingId: string;
  meetingTitle: string;
  onDone: () => void;
}

interface TranscriptSegment {
  id: number;
  text: string;
  isFinal: boolean;
}

type CaptureSource = "sidecar" | "mic";

type CaptureStatus =
  | "idle"
  | "recording"
  | "stopping"
  | "saving"
  | "summarizing"
  | "done"
  | "error";

const CHUNK_INTERVAL_MS = 250;

export function CaptureScreen({ meetingId, meetingTitle, onDone }: CaptureScreenProps) {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [source, setSource] = useState<CaptureSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  // Browser/MediaRecorder path
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micChunksRef = useRef<Blob[]>([]);

  // Sidecar/PCM path
  const sidecarUnsubsRef = useRef<Array<() => void>>([]);
  const pcmChunksRef = useRef<Uint8Array[]>([]);

  // Common
  const deepgramRef = useRef<DeepgramHandle | null>(null);
  const startedAtRef = useRef<number>(0);
  const segIdRef = useRef(0);
  const finalTranscriptRef = useRef("");

  // Timer
  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(
      () => setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [status]);

  // Cleanup on unmount (safety net — Stop button is the primary path)
  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        // ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      sidecarUnsubsRef.current.forEach((un) => un());
      sidecarUnsubsRef.current = [];
      void window.octofocus.capture.stop().catch(() => undefined);
      deepgramRef.current?.close();
    };
  }, []);

  function handleSegment(seg: { isFinal: boolean; text: string }) {
    if (seg.isFinal) {
      const text = seg.text.trim();
      if (text) {
        finalTranscriptRef.current = [finalTranscriptRef.current, text]
          .filter(Boolean)
          .join(" ");
        segIdRef.current += 1;
        setSegments((prev) => [...prev, { id: segIdRef.current, text, isFinal: true }]);
      }
      setInterimText("");
    } else {
      setInterimText(seg.text);
    }
  }

  async function tryStartSidecar(): Promise<boolean> {
    if (window.octofocus.platform !== "darwin") return false;
    try {
      const dg = connectDeepgram({
        // Sidecar emits raw linear16 PCM; deepgram.ts reads this
        // mime to set encoding+sample_rate query params.
        mimeType: "audio/linear16",
        onSegment: handleSegment,
        onError: (err) => setError(err.message),
      });
      deepgramRef.current = dg;

      // Subscribe to chunks BEFORE starting the sidecar so the first
      // frames don't slip past unhandled.
      const unsubChunk = window.octofocus.capture.onChunk((chunk) => {
        const u8 = new Uint8Array(chunk);
        pcmChunksRef.current.push(u8);
        dg.send(chunk);
      });
      const unsubLog = window.octofocus.capture.onLog((line) =>
        console.log("[sidecar]", line.trim()),
      );
      const unsubErr = window.octofocus.capture.onError((info) =>
        setError(`Sidecar error: ${info.message}`),
      );
      const unsubExit = window.octofocus.capture.onExit((info) => {
        if (info.code !== 0 && info.code !== null) {
          setError(`Sidecar exited with code ${info.code}`);
        }
      });
      sidecarUnsubsRef.current = [unsubChunk, unsubLog, unsubErr, unsubExit];

      await window.octofocus.capture.start();
      return true;
    } catch (err) {
      console.warn("sidecar start failed, falling back to mic:", err);
      sidecarUnsubsRef.current.forEach((un) => un());
      sidecarUnsubsRef.current = [];
      deepgramRef.current?.close();
      deepgramRef.current = null;
      return false;
    }
  }

  async function startMicFallback(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
    recorderRef.current = recorder;
    micChunksRef.current = [];

    const dg = connectDeepgram({
      mimeType,
      onSegment: handleSegment,
      onError: (err) => setError(err.message),
    });
    deepgramRef.current = dg;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        micChunksRef.current.push(event.data);
        event.data.arrayBuffer().then((buf) => dg.send(buf)).catch(() => undefined);
      }
    };
    recorder.start(CHUNK_INTERVAL_MS);
  }

  async function handleStart() {
    setError(null);
    pcmChunksRef.current = [];
    micChunksRef.current = [];
    setSegments([]);
    setInterimText("");
    finalTranscriptRef.current = "";
    try {
      const usedSidecar = await tryStartSidecar();
      if (usedSidecar) {
        setSource("sidecar");
      } else {
        await startMicFallback();
        setSource("mic");
      }
      startedAtRef.current = Date.now();
      setStatus("recording");
      setElapsedSec(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start capture.");
      setStatus("error");
    }
  }

  async function stopAudioSource(): Promise<{ blob: Blob; durationSec: number }> {
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
    if (source === "sidecar") {
      await window.octofocus.capture.stop();
      sidecarUnsubsRef.current.forEach((un) => un());
      sidecarUnsubsRef.current = [];
      const totalBytes = pcmChunksRef.current.reduce((a, b) => a + b.byteLength, 0);
      const merged = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of pcmChunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const blob = wrapPcmAsWav(merged);
      return { blob, durationSec };
    }
    // Mic fallback path
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(micChunksRef.current, { type: "audio/webm" });
    return { blob, durationSec };
  }

  async function handleStop() {
    if (status !== "recording") return;
    setStatus("stopping");
    deepgramRef.current?.close();
    deepgramRef.current = null;

    let blob: Blob;
    let durationSec = 0;
    try {
      const audio = await stopAudioSource();
      blob = audio.blob;
      durationSec = audio.durationSec;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      await uploadMeetingAudio(meetingId, blob, durationSec);
      const transcriptText = finalTranscriptRef.current.trim();
      await patchMeeting(meetingId, { transcript: transcriptText });

      if (transcriptText.length > 0) {
        setStatus("summarizing");
        try {
          const result = await summarizeMeeting(meetingId);
          if (result.summary) setSummary(result.summary);
        } catch (err) {
          console.error("summarize failed", err);
          setError(
            err instanceof Error ? `Summary failed: ${err.message}` : "Summary failed.",
          );
        }
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <button
          type="button"
          onClick={onDone}
          className="text-muted-foreground hover:text-foreground text-xs"
          disabled={status === "recording" || status === "saving" || status === "stopping"}
        >
          ← Back
        </button>
        <span className="text-sm font-medium">{meetingTitle}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {formatTime(elapsedSec)}
        </span>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto px-6 py-4">
          {summary ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Summary</p>
              <pre className="bg-muted/40 whitespace-pre-wrap rounded-md p-3 font-sans text-sm leading-relaxed">
                {summary}
              </pre>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Transcript</p>
              <div className="space-y-2 text-sm leading-relaxed">
                {segments.map((s) => (
                  <p key={s.id}>{s.text}</p>
                ))}
              </div>
            </div>
          ) : segments.length === 0 && !interimText ? (
            <p className="text-muted-foreground/70 mt-8 text-center text-sm">
              {status === "idle" ? "Press Start to begin recording." : "Listening…"}
            </p>
          ) : (
            <div className="space-y-2 text-sm leading-relaxed">
              {segments.map((s) => (
                <p key={s.id}>{s.text}</p>
              ))}
              {interimText ? (
                <p className="text-muted-foreground italic">{interimText}</p>
              ) : null}
            </div>
          )}
        </div>
        <div className="border-border flex items-center justify-between border-t px-6 py-3">
          <span className="text-muted-foreground text-[11px]">
            {source === "sidecar"
              ? "Mic + system audio"
              : source === "mic"
                ? "Mic only (fallback)"
                : ""}
          </span>
          <div className="flex items-center gap-3">
            {status === "idle" || status === "error" ? (
              <button
                type="button"
                onClick={() => void handleStart()}
                className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium"
              >
                ● Start
              </button>
            ) : status === "recording" ? (
              <button
                type="button"
                onClick={() => void handleStop()}
                className="bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm font-medium"
              >
                ■ Stop
              </button>
            ) : status === "stopping" ? (
              <p className="text-muted-foreground text-xs">Finishing…</p>
            ) : status === "saving" ? (
              <p className="text-muted-foreground text-xs">Saving meeting…</p>
            ) : status === "summarizing" ? (
              <p className="text-muted-foreground text-xs">Generating summary…</p>
            ) : (
              <button
                type="button"
                onClick={onDone}
                className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
        {error ? (
          <div className="bg-destructive/10 text-destructive border-t border-destructive/30 px-6 py-2 text-xs">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
