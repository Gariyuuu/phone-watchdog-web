"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONFIDENCE_THRESHOLD = 0.35;
const DETECT_INTERVAL_MS = 300;

// Rolling-window debounce instead of a strict consecutive-frame streak:
// a single missed frame (occlusion by a hand, motion blur, a bad angle)
// no longer resets progress back to zero.
const TRIGGER_WINDOW = 6; // ~1.8s of samples
const TRIGGER_HITS = 3; // seen in at least half of them
const CLEAR_WINDOW = 10; // ~3s of samples
const CLEAR_HITS = 0; // must be fully gone for the whole window

type CatchRow = {
  id: number;
  caught_at: string;
  cleared_at: string | null;
};

// Loud two-tone siren using the Web Audio API — no external sound asset needed.
function startSiren() {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  gain.gain.value = 0.15;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();

  let high = true;
  const toneId = setInterval(() => {
    oscillator.frequency.setValueAtTime(high ? 880 : 660, ctx.currentTime);
    high = !high;
  }, 350);

  return () => {
    clearInterval(toneId);
    oscillator.stop();
    ctx.close();
  };
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<Awaited<
    ReturnType<typeof import("@tensorflow-models/coco-ssd").load>
  > | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<boolean[]>([]);
  const stopSirenRef = useRef<(() => void) | null>(null);
  const currentCatchIdRef = useRef<number | null>(null);

  const [modelLoading, setModelLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [caught, setCaught] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<CatchRow[]>([]);

  const refreshLog = useCallback(async () => {
    try {
      const res = await fetch("/api/catches");
      if (!res.ok) return;
      const data = await res.json();
      setLog(data.catches ?? []);
    } catch {
      // logging is best-effort; ignore failures here
    }
  }, []);

  useEffect(() => {
    (async () => {
      const tf = await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      await tf.ready();
      // mobilenet_v2 is slower but noticeably more accurate than the
      // lite_mobilenet_v2 default, which is tuned for speed and misses
      // partially hand-occluded phones fairly often.
      modelRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
      setModelLoading(false);
    })();
    refreshLog();
  }, [refreshLog]);

  const clearAlarm = useCallback(() => {
    setCaught(false);
    stopSirenRef.current?.();
    stopSirenRef.current = null;
  }, []);

  const closeCurrentCatch = useCallback(() => {
    const id = currentCatchIdRef.current;
    currentCatchIdRef.current = null;
    if (id == null) return;
    fetch("/api/catches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .catch(() => {})
      .finally(refreshLog);
  }, [refreshLog]);

  const triggerAlarm = useCallback(() => {
    setCaught(true);
    stopSirenRef.current = startSiren();
    fetch("/api/catches", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        currentCatchIdRef.current = data.catch?.id ?? null;
        refreshLog();
      })
      .catch(() => {});
  }, [refreshLog]);

  const dismiss = useCallback(() => {
    clearAlarm();
    closeCurrentCatch();
    samplesRef.current = [];
  }, [clearAlarm, closeCurrentCatch]);

  useEffect(() => {
    if (!caught) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [caught, dismiss]);

  const runDetection = useCallback(async () => {
    const model = modelRef.current;
    const video = videoRef.current;
    if (!model || !video || video.readyState < 2) return;

    const predictions = await model.detect(video, 20, CONFIDENCE_THRESHOLD);
    const phoneSeen = predictions.some((p) => p.class === "cell phone");

    const samples = samplesRef.current;
    samples.push(phoneSeen);
    if (samples.length > CLEAR_WINDOW) samples.shift();

    if (!caught) {
      const recent = samples.slice(-TRIGGER_WINDOW);
      const hits = recent.filter(Boolean).length;
      if (recent.length >= TRIGGER_WINDOW && hits >= TRIGGER_HITS) {
        triggerAlarm();
      }
    } else {
      const hits = samples.filter(Boolean).length;
      if (samples.length >= CLEAR_WINDOW && hits <= CLEAR_HITS) {
        dismiss();
      }
    }
  }, [caught, triggerAlarm, dismiss]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      samplesRef.current = [];
      setRunning(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not access webcam."
      );
    }
  }, []);

  const stop = useCallback(() => {
    if (detectTimerRef.current) clearInterval(detectTimerRef.current);
    detectTimerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
    dismiss();
  }, [dismiss]);

  // Detection loop reads latest `caught`/`triggerAlarm`/`dismiss` via closure;
  // keep the interval fresh whenever those change so it never runs stale.
  useEffect(() => {
    if (!running) return;
    if (detectTimerRef.current) clearInterval(detectTimerRef.current);
    detectTimerRef.current = setInterval(runDetection, DETECT_INTERVAL_MS);
    return () => {
      if (detectTimerRef.current) clearInterval(detectTimerRef.current);
    };
  }, [running, runDetection]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopSirenRef.current?.();
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 p-8">
      <h1 className="text-2xl font-bold">Phone Watchdog</h1>

      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full max-w-md rounded-lg bg-black"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={running ? stop : start}
          disabled={modelLoading}
          className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white disabled:opacity-50"
        >
          {modelLoading ? "Loading model…" : running ? "Stop" : "Start"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </div>

      <section className="w-full max-w-md">
        <h2 className="mb-2 text-lg font-semibold">Caught log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing yet. Good.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {log.map((row) => (
              <li key={row.id} className="flex justify-between gap-4">
                <span>{new Date(row.caught_at).toLocaleString()}</span>
                <span className="text-gray-500">
                  {row.cleared_at
                    ? `${Math.round(
                        (new Date(row.cleared_at).getTime() -
                          new Date(row.caught_at).getTime()) /
                          1000
                      )}s`
                    : "…"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {caught && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-red-800">
          <p className="text-center text-5xl font-extrabold text-white sm:text-6xl">
            PUT YOUR PHONE DOWN
          </p>
          <p className="text-white/80">
            Closes automatically once the phone is out of frame — or press
            ESC.
          </p>
        </div>
      )}
    </div>
  );
}
