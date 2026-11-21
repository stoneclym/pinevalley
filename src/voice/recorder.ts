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
  /** Short facts for the error line when something goes wrong (track muted, meter state…). */
  diagnostics: () => string;
};

const SPEECH_LEVEL = 0.06;      // level that counts as someone talking
const NO_SPEECH_GIVE_UP_S = 8;  // stop if nobody says anything at all

export function pickMimeType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

/**
 * Call this directly from a tap handler.
 *
 * Order matters on iOS, and matches the Phase 0 mic test page: microphone first, recorder
 * started at once and collecting audio in small slices as it goes, and only then the level
 * meter. Creating the meter's AudioContext before the microphone could leave iOS capturing in
 * playback mode and hand back an empty recording.
 */
export async function startRecording(opts: RecorderOptions): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  rec.start(250); // deliver audio every 250 ms instead of all at the end

  // Level meter for the waveform and silence detection. If iOS keeps it suspended, the meter
  // just reads zero: recording still works, and silence auto-stop is skipped (see below).
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  try {
    ctx = new Ctx();
    void ctx.resume().catch(() => {});
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
  } catch (err) {
    console.warn("level meter unavailable", err);
  }
  const buf = new Float32Array(1024);

  let cancelled = false;
  let raf = 0;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => {});
    opts.onLevel(0);
  };

  const result = new Promise<Blob | null>((resolve, reject) => {
    rec.onstop = () => {
      // Safari can deliver the last slice just after "stop"; wait a moment before building the clip.
      window.setTimeout(() => {
        const blob = cancelled ? null : new Blob(chunks, { type: rec.mimeType || mimeType || "audio/mp4" });
        release();
        resolve(blob);
      }, 120);
    };
    rec.onerror = (e) => {
      release();
      reject((e as unknown as { error?: Error }).error ?? new Error("Recording failed"));
    };
  });

  const stop = () => {
    if (rec.state === "inactive") return;
    stoppedAt = performance.now();
    try {
      rec.requestData();
    } catch {
      /* not supported: stop still delivers the final slice */
    }
    rec.stop();
  };
  const startedAt = performance.now();
  let stoppedAt = 0;
  let heardSpeech = false;
  let meterWorks = false;
  const track = stream.getAudioTracks()[0];
  const trackFacts = () =>
    track ? `track ${track.readyState}${track.muted ? " muted" : ""}${track.enabled ? "" : " disabled"}` : "no audio track";
  let quietSince = startedAt;

  const tick = () => {
    let level = 0;
    if (analyser) {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      if (sum > 0) meterWorks = true;
      level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
    }
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
      // Silence rules only when the meter actually hears something; otherwise wait for Stop.
      (meterWorks && heardSpeech && quietFor >= opts.silenceStopSeconds) ||
      (meterWorks && !heardSpeech && elapsed >= NO_SPEECH_GIVE_UP_S)
    ) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop,
    cancel: () => {
      cancelled = true;
      if (rec.state === "inactive") release();
      else rec.stop();
    },
    result,
    diagnostics: () =>
      [
        `${chunks.length} slices`,
        `${(((stoppedAt || performance.now()) - startedAt) / 1000).toFixed(1)} s`,
        trackFacts(),
        `meter ${ctx ? ctx.state : "none"}${meterWorks ? " heard" : " silent"}`,
        rec.mimeType || mimeType || "default type",
      ].join(" · "),
  };
}
