/**
 * Microphone recording for the voice sheet, built to be as gentle with iOS as possible.
 *
 * - Microphone only: getUserMedia + MediaRecorder, nothing else. No AudioContext or level meter,
 *   because opening a second audio channel can make iOS reshuffle its audio setup and cut the
 *   microphone off in a Home Screen app. The waveform on screen is a decorative animation.
 * - One microphone stream is kept open between recordings (for a few minutes after the last
 *   one), so iOS asks for permission once per session instead of every time. It is dropped when
 *   the app is hidden or the iPad sleeps, and replaced if iOS ever mutes or ends it.
 * - If iOS cuts the microphone off mid-recording (the orange dot disappears: the track is muted
 *   or ended), recording stops right away with a clear error instead of listening to silence.
 */

export type RecorderOptions = {
  maxSeconds: number;
};

export type Recorder = {
  /** Stop and keep the clip. */
  stop: () => void;
  /** Stop and throw the clip away. */
  cancel: () => void;
  /** Resolves with the clip after stop() or the time limit; null after cancel(). Rejects with MicCutError if iOS cuts the mic. */
  result: Promise<Blob | null>;
  /** Short facts for the error line when something goes wrong. */
  diagnostics: () => string;
};

/** iOS took the microphone away (muted or ended the track), or sent no audio at all. */
export class MicCutError extends Error {
  name = "MicCutError";
}

const KEEP_OPEN_MS = 3 * 60_000;

export function pickMimeType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

// ---- One shared microphone stream ----

let shared: MediaStream | null = null;
let closeTimer: number | undefined;

function healthy(s: MediaStream | null): s is MediaStream {
  const t = s?.getAudioTracks()[0];
  return !!t && t.readyState === "live" && !t.muted && t.enabled;
}

/** Close the shared microphone (the orange dot goes away). */
export function closeMicrophone() {
  clearTimeout(closeTimer);
  shared?.getTracks().forEach((t) => t.stop());
  shared = null;
}

async function openMicrophone(): Promise<MediaStream> {
  clearTimeout(closeTimer);
  if (healthy(shared)) return shared;
  closeMicrophone();
  shared = await navigator.mediaDevices.getUserMedia({ audio: true });
  return shared;
}

function closeLater() {
  clearTimeout(closeTimer);
  closeTimer = window.setTimeout(closeMicrophone, KEEP_OPEN_MS);
}

// A hidden or sleeping app gets a fresh microphone next time; an old one is usually dead.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") closeMicrophone();
});

/** Call this directly from a tap handler, so the microphone request happens inside the tap. */
export async function startRecording(opts: RecorderOptions): Promise<Recorder> {
  const stream = await openMicrophone();
  const track = stream.getAudioTracks()[0];

  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const startedAt = performance.now();
  let stoppedAt = 0;
  let cancelled = false;
  let cut = false;
  let settled = false;
  let limit: number | undefined;

  const diagnostics = () =>
    [
      `${chunks.length} slices`,
      `${(((stoppedAt || performance.now()) - startedAt) / 1000).toFixed(1)} s`,
      track ? `track ${track.readyState}${track.muted ? " muted" : ""}${track.enabled ? "" : " disabled"}` : "no audio track",
      rec.mimeType || mimeType || "default type",
    ].join(" · ");

  let resolveResult!: (b: Blob | null) => void;
  let rejectResult!: (e: Error) => void;
  const result = new Promise<Blob | null>((res, rej) => {
    resolveResult = res;
    rejectResult = rej;
  });

  const stop = () => {
    if (rec.state === "inactive") return;
    stoppedAt = performance.now();
    try {
      rec.requestData();
    } catch {
      /* stop still delivers the final slice */
    }
    rec.stop();
  };

  // The orange dot disappearing: iOS muted or ended the track. Stop now and say so.
  const onCut = () => {
    cut = true;
    stop();
  };

  const cleanup = () => {
    clearTimeout(limit);
    track?.removeEventListener("mute", onCut);
    track?.removeEventListener("ended", onCut);
  };

  rec.onstop = () => {
    // Safari can deliver the last slice just after "stop"; wait a moment before building the clip.
    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      if (cut) {
        closeMicrophone(); // a cut microphone won't recover; get a fresh one next time
        rejectResult(new MicCutError(`iOS cut off the microphone · ${diagnostics()}`));
        return;
      }
      closeLater();
      if (cancelled) return resolveResult(null);
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/mp4" });
      if (!blob.size) {
        closeMicrophone();
        rejectResult(new MicCutError(`The iPad sent no audio · ${diagnostics()}`));
        return;
      }
      resolveResult(blob);
    }, 150);
  };
  rec.onerror = (e) => {
    if (settled) return;
    settled = true;
    cleanup();
    closeMicrophone();
    rejectResult((e as unknown as { error?: Error }).error ?? new Error("Recording failed"));
  };

  track?.addEventListener("mute", onCut);
  track?.addEventListener("ended", onCut);
  rec.start(250);
  limit = window.setTimeout(stop, opts.maxSeconds * 1000);

  return {
    stop,
    cancel: () => {
      cancelled = true;
      stop();
    },
    result,
    diagnostics,
  };
}
