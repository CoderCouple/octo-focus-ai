/**
 * Deepgram streaming transcription client. Opens a WebSocket to
 * `wss://api.deepgram.com/v1/listen`, forwards audio chunks as
 * received (the format negotiated below — `opus` from MediaRecorder
 * is fine), and emits interim + final transcript segments back to
 * the caller via callback.
 *
 * Auth: an API key embedded in the renderer at build time via
 * `VITE_DEEPGRAM_API_KEY`. Long-term this should be replaced with a
 * short-lived session token minted server-side (`POST
 * /v1/auth/grant`) so the renderer never sees the raw key — flagged
 * in the source for the production hardening pass.
 */

export interface DeepgramSegment {
  /** True once Deepgram marks the transcript as final for this slice. */
  isFinal: boolean;
  /** Whole utterance — Deepgram concatenates words for us. */
  text: string;
}

export interface DeepgramOptions {
  /** MIME type emitted by MediaRecorder. Deepgram auto-detects opus inside webm. */
  mimeType: string;
  /** Receives every interim + final transcript segment as it arrives. */
  onSegment: (segment: DeepgramSegment) => void;
  /** Called once when the underlying WebSocket errors / closes unexpectedly. */
  onError?: (err: Error) => void;
}

/** Build the streaming endpoint URL with the parameters we care about. */
function buildUrl(mimeType: string): string {
  const params = new URLSearchParams({
    model: "nova-2-meeting",
    interim_results: "true",
    smart_format: "true",
    punctuate: "true",
    diarize: "true",
    language: "en-US",
  });
  // Two paths today:
  //  - MediaRecorder webm/opus (browser fallback, not used by the
  //    sidecar path): Deepgram infers opus from the bytes.
  //  - Swift sidecar linear16 PCM at 16 kHz mono: must tell Deepgram
  //    the encoding + sample rate explicitly.
  if (mimeType === "audio/linear16") {
    params.set("encoding", "linear16");
    params.set("sample_rate", "16000");
    params.set("channels", "1");
  } else if (mimeType.includes("opus") || mimeType.includes("webm")) {
    params.set("encoding", "opus");
  }
  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
}

export interface DeepgramHandle {
  /** Forward a chunk from MediaRecorder.ondataavailable. */
  send(chunk: ArrayBuffer | Blob): void;
  /** Politely close — sends Deepgram's `CloseStream` then closes the socket. */
  close(): void;
  /** Underlying WS readyState (1 === OPEN). */
  readyState(): number;
}

export function connectDeepgram(options: DeepgramOptions): DeepgramHandle {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined;
  if (!apiKey) {
    options.onError?.(
      new Error(
        "VITE_DEEPGRAM_API_KEY is not set. Add it to apps/desktop/.env.local.",
      ),
    );
    return {
      send: () => undefined,
      close: () => undefined,
      readyState: () => WebSocket.CLOSED,
    };
  }

  // Deepgram supports auth via a `Sec-WebSocket-Protocol` token, which
  // is the only way to attach a credential to a WS handshake from the
  // browser API (the standard WebSocket constructor doesn't accept
  // custom headers).
  const ws = new WebSocket(buildUrl(options.mimeType), ["token", apiKey]);
  ws.binaryType = "arraybuffer";

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data as string) as {
        type?: string;
        channel?: { alternatives?: Array<{ transcript?: string }> };
        is_final?: boolean;
      };
      if (data.type !== "Results") return;
      const transcript = data.channel?.alternatives?.[0]?.transcript ?? "";
      if (!transcript) return;
      options.onSegment({ isFinal: Boolean(data.is_final), text: transcript });
    } catch (err) {
      console.error("deepgram: parse failed", err);
    }
  });

  ws.addEventListener("error", () => {
    options.onError?.(new Error("Deepgram WebSocket error"));
  });
  ws.addEventListener("close", (event) => {
    if (event.code !== 1000) {
      options.onError?.(
        new Error(`Deepgram WebSocket closed (${event.code} ${event.reason || ""})`),
      );
    }
  });

  return {
    send(chunk) {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(chunk);
    },
    close() {
      if (ws.readyState === WebSocket.OPEN) {
        // CloseStream tells Deepgram to flush any in-flight transcript
        // before tearing the socket down.
        ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      try {
        ws.close(1000, "client stop");
      } catch {
        // already closed
      }
    },
    readyState: () => ws.readyState,
  };
}
