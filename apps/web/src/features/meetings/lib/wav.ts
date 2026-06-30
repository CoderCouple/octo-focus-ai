/**
 * Wrap a flat int16 PCM buffer in a WAV (RIFF/WAVE) container so the
 * resulting Blob can be uploaded as-is and replayed by any audio
 * player. The Swift `mac-audio-capture` sidecar emits 16 kHz mono
 * int16 PCM with no header; the renderer prepends the 44-byte WAV
 * header at upload time.
 */
const PCM_FORMAT = 1; // linear PCM
const SAMPLE_RATE = 16_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export function wrapPcmAsWav(pcm: Uint8Array): Blob {
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;
  const dataSize = pcm.byteLength;
  const fileSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  return new Blob([header, pcm.buffer as ArrayBuffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
