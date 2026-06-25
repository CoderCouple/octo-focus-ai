"use client";

import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMeetingAudioObjectUrl,
  uploadMeetingAudio,
} from "../api/meetings-client-api";
import { formatDuration } from "../lib/format-duration";

type RecorderState = "idle" | "recording" | "paused" | "uploading" | "done";

interface MeetingRecorderProps {
  meetingId: string;
  /**
   * `true` when the backend has audio for this meeting already (from a
   * previous session). Drives whether we autoload the playback URL.
   */
  hasInitialAudio: boolean;
  /** Backend-recorded duration in seconds, used while no live recording exists. */
  initialDurationSec: number | null;
  /** Fires after a fresh upload finishes so the page can refresh. */
  onUploaded: () => void;
}

/**
 * Browser-side meeting recorder. Captures mic audio via MediaRecorder
 * (webm/opus by default), shows elapsed time, lets the user pause /
 * resume / stop, then uploads the final Blob to the API. Once uploaded,
 * the same component renders an `<audio controls>` so the user can
 * play it back.
 *
 * Re-recording replaces the previous audio on the backend (PATCH style
 * upload to the same endpoint).
 */
export function MeetingRecorder({
  meetingId,
  hasInitialAudio,
  initialDurationSec,
  onUploaded,
}: MeetingRecorderProps) {
  const [state, setState] = useState<RecorderState>(hasInitialAudio ? "done" : "idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load existing recording on mount.
  useEffect(() => {
    if (!hasInitialAudio) return;
    let url: string | null = null;
    void (async () => {
      try {
        url = await getMeetingAudioObjectUrl(meetingId);
        setAudioUrl(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load recording");
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasInitialAudio, meetingId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      mediaStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      });
      recorder.addEventListener("stop", async () => {
        stopTimer();
        const finalElapsed = elapsedSec; // captured at stop time
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        // Stop the mic.
        stream.getTracks().forEach((t) => t.stop());
        mediaStream.current = null;

        setState("uploading");
        try {
          await uploadMeetingAudio(meetingId, blob, finalElapsed);
          // Local playback URL straight from the blob — saves a fetch.
          const url = URL.createObjectURL(blob);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setState("done");
          onUploaded();
          toast.success("Recording saved");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
          setState("idle");
        }
      });
      recorder.start();
      mediaRecorder.current = recorder;
      setElapsedSec(0);
      setState("recording");
      startTimer();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not access microphone";
      toast.error(`${msg}. Allow microphone access in your browser settings.`);
    }
  };

  const handlePause = () => {
    mediaRecorder.current?.pause();
    stopTimer();
    setState("paused");
  };

  const handleResume = () => {
    mediaRecorder.current?.resume();
    startTimer();
    setState("recording");
  };

  const handleStop = () => {
    mediaRecorder.current?.stop();
    // The "stop" handler does the upload + state transition.
  };

  const displayDuration =
    state === "done"
      ? formatDuration(initialDurationSec ?? elapsedSec)
      : formatDuration(elapsedSec);

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={
              state === "recording"
                ? "bg-destructive size-3 shrink-0 animate-pulse rounded-full"
                : state === "paused"
                  ? "bg-muted-foreground size-3 shrink-0 rounded-full"
                  : state === "done"
                    ? "bg-foreground size-3 shrink-0 rounded-full"
                    : "border-border size-3 shrink-0 rounded-full border"
            }
          />
          <div className="text-sm font-medium">
            {state === "idle" && "Ready to record"}
            {state === "recording" && "Recording…"}
            {state === "paused" && "Paused"}
            {state === "uploading" && "Saving…"}
            {state === "done" && "Recording saved"}
          </div>
          <div className="text-muted-foreground tabular-nums text-sm">{displayDuration}</div>
        </div>
        <div className="flex items-center gap-2">
          {state === "idle" || state === "done" ? (
            <Button size="sm" onClick={handleStart}>
              <Mic className="h-4 w-4" />
              {state === "done" ? "Record again" : "Start recording"}
            </Button>
          ) : null}
          {state === "recording" ? (
            <>
              <Button size="sm" variant="outline" onClick={handlePause}>
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          ) : null}
          {state === "paused" ? (
            <>
              <Button size="sm" onClick={handleResume}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          ) : null}
          {state === "uploading" ? (
            <Button size="sm" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </Button>
          ) : null}
        </div>
      </div>
      {audioUrl ? (
        <audio src={audioUrl} controls className="w-full" preload="metadata" />
      ) : null}
    </div>
  );
}
