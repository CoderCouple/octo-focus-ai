/**
 * Live capture screen — the meeting listener proper. PR3 covers
 * mic-only capture; PR5 swaps the audio source for the Swift sidecar
 * that mixes system audio + mic.
 *
 * Flow:
 *   1. Renderer requests mic via getUserMedia.
 *   2. MediaRecorder emits webm/opus chunks on a 250ms timer.
 *   3. Each chunk is forwarded to a Deepgram WS in parallel — live
 *      transcript renders as Deepgram pushes interim + final segments.
 *   4. Stop button: close the WS, finalise the MediaRecorder, upload
 *      the full webm blob, PATCH the final transcript.
 */
import { useEffect, useRef, useState } from "react";
import { patchMeeting, uploadMeetingAudio } from "../lib/api";
import { connectDeepgram, type DeepgramHandle } from "../lib/deepgram";

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

const CHUNK_INTERVAL_MS = 250;

export function CaptureScreen({ meetingId, meetingTitle, onDone }: CaptureScreenProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "stopping" | "saving" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [interimText, setInterimText] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const deepgramRef = useRef<DeepgramHandle | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        // ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      deepgramRef.current?.close();
    };
  }, []);

  async function handleStart() {
    setError(null);
    try {
      // Request mic. PR5 will replace this with the Swift sidecar
      // that mixes mic + system audio.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Pick the best supported MIME — webm/opus is universal in
      // Chromium-based Electron and Deepgram parses it directly.
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
      recorderRef.current = recorder;
      chunksRef.current = [];

      const dg = connectDeepgram({
        mimeType,
        onSegment: (seg) => {
          if (seg.isFinal) {
            const text = seg.text.trim();
            if (text) {
              finalTranscriptRef.current = [finalTranscriptRef.current, text]
                .filter(Boolean)
                .join(" ");
              segIdRef.current += 1;
              setSegments((prev) => [
                ...prev,
                { id: segIdRef.current, text, isFinal: true },
              ]);
            }
            setInterimText("");
          } else {
            setInterimText(seg.text);
          }
        },
        onError: (err) => {
          console.error("deepgram", err);
          setError(err.message);
        },
      });
      deepgramRef.current = dg;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          // Forward the same chunk to Deepgram (raw ArrayBuffer).
          event.data.arrayBuffer().then((buf) => dg.send(buf)).catch(() => undefined);
        }
      };

      recorder.start(CHUNK_INTERVAL_MS);
      startedAtRef.current = Date.now();
      setStatus("recording");
      setElapsedSec(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start capture.");
      setStatus("error");
    }
  }

  async function handleStop() {
    if (status !== "recording") return;
    setStatus("stopping");

    // Wait for MediaRecorder to drain its final chunk.
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    deepgramRef.current?.close();

    setStatus("saving");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
    try {
      await uploadMeetingAudio(meetingId, blob, durationSec);
      await patchMeeting(meetingId, {
        transcript: finalTranscriptRef.current.trim(),
      });
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
          {segments.length === 0 && !interimText ? (
            <p className="text-muted-foreground/70 mt-8 text-center text-sm">
              {status === "idle"
                ? "Press Start to begin recording."
                : "Listening…"}
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
        <div className="border-border flex items-center justify-center gap-3 border-t px-6 py-3">
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
