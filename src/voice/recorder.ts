/**
 * Microphone recording for the voice sheet: getUserMedia + MediaRecorder, with the level
 * from an AnalyserNode on the same stream. Safari records audio/mp4, others audio/webm.
 * The microphone tracks are released the moment recording stops or is cancelled
 * (spec risk 2: installed iPad web apps can lose the mic if a stream is left open).
 */

export type RecorderOptions = {
  maxSeconds: number;
  silenceStopSeconds: number;
  /** Called about 30 times a second with a 0–1 level. */
  onLevel: (level: number) => void;
};

export type Recorder = {
  /** Stop and keep the clip. */
  stop: () => void;
  /** Stop and throw the clip away. */
  cancel: () => void;
  /** Resolves with the clip after stop() or an automatic stop; null after cancel(). */
  result: Promise<Blob | null>;
};

const SPEECH_LEVEL = 0.06;      // level that counts as someone talking
const NO_SPEECH_GIVE_UP_S = 8;  // stop if nobody says anything at all

export function pickMimeType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

/**
 * Call this directly from a tap handler. The AudioContext is created before the first await,
 * so it starts inside the tap; Safari keeps audio suspended otherwise and the level reads zero.
 */
export async function startRecording(opts: RecorderOptions): Promise<Recorder> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  void ctx.resume();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    ctx.close().catch(() => {});
    throw err;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  let cancelled = false;
  let raf = 0;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
    opts.onLevel(0);
  };

  const result = new Promise<Blob | null>((resolve, reject) => {
    rec.onstop = () => {
      release();
      resolve(cancelled ? null : new Blob(chunks, { type: rec.mimeType || mimeType || "audio/mp4" }));
    };
    rec.onerror = (e) => {
      release();
      reject((e as unknown as { error?: Error }).error ?? new Error("Recording failed"));
    };
  });

  const stop = () => rec.state !== "inactive" && rec.stop();
  const startedAt = performance.now();
  let heardSpeech = false;
  let quietSince = startedAt;

  const tick = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
    opts.onLevel(level);

    const t = performance.now();
    if (level > SPEECH_LEVEL) {
      heardSpeech = true;
      quietSince = t;
    }
    const elapsed = (t - startedAt) / 1000;
    const quietFor = (t - quietSince) / 1000;
    if (
      elapsed >= opts.maxSeconds ||
      (heardSpeech && quietFor >= opts.silenceStopSeconds) ||
      (!heardSpeech && elapsed >= NO_SPEECH_GIVE_UP_S)
    ) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  rec.start();
  raf = requestAnimationFrame(tick);

  return {
    stop,
    cancel: () => {
      cancelled = true;
      if (rec.state === "inactive") release();
      else rec.stop();
    },
    result,
  };
}
