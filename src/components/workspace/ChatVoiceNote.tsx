import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createChatAttachmentObjectUrl,
  isChatAudioAttachment,
  pickVoiceRecordingFormat,
} from "@/lib/chatUpload";
import type { DirectChatAttachment } from "@/lib/workspaceDirectChatRealtime";

export const VOICE_WAVEFORM_BARS = 40;

export type VoiceNoteSendPayload = {
  file: File;
  duration: number;
  waveform: number[];
};

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizePeaks(peaks: number[] | undefined, barCount = VOICE_WAVEFORM_BARS): number[] {
  if (!peaks?.length) {
    return Array.from({ length: barCount }, (_, i) => 0.22 + ((i * 17) % 7) * 0.05);
  }
  if (peaks.length === barCount) {
    return peaks.map((v) => Math.max(0.08, Math.min(1, Number(v) || 0)));
  }
  const out: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor((i / barCount) * peaks.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / barCount) * peaks.length));
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, Number(peaks[j]) || 0);
    out.push(Math.max(0.08, Math.min(1, max)));
  }
  return out;
}

function downsamplePeaks(samples: number[], barCount = VOICE_WAVEFORM_BARS): number[] {
  if (!samples.length) return normalizePeaks(undefined, barCount);
  const chunk = Math.max(1, Math.floor(samples.length / barCount));
  const peaks: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = i * chunk;
    const end = i === barCount - 1 ? samples.length : Math.min(samples.length, start + chunk);
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, samples[j] || 0);
    peaks.push(Math.max(0.08, Math.min(1, max)));
  }
  return peaks;
}

function VoiceWaveform({
  peaks,
  progress = 0,
  live = false,
  own = false,
  className,
  onSeek,
}: {
  peaks: number[];
  progress?: number;
  live?: boolean;
  own?: boolean;
  className?: string;
  onSeek?: (ratio: number) => void;
}) {
  const bars = normalizePeaks(peaks);

  return (
    <div
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-[2px]",
        onSeek && "cursor-pointer",
        className,
      )}
      role={onSeek ? "slider" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      onClick={
        onSeek
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              if (!rect.width) return;
              onSeek(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
            }
          : undefined
      }
    >
      {bars.map((height, index) => {
        const played = live ? true : index / bars.length <= progress;
        return (
          <span
            key={index}
            className={cn(
              "inline-block w-[2.5px] shrink-0 rounded-full transition-[height,background-color] duration-75",
              live
                ? "bg-red-500"
                : played
                  ? own
                    ? "bg-white"
                    : "bg-sky-500"
                  : own
                    ? "bg-white/35"
                    : "bg-gray-300",
            )}
            style={{ height: `${Math.round(8 + height * 22)}px` }}
          />
        );
      })}
    </div>
  );
}

export function ChatVoicePlayer({
  attachment,
  own = false,
}: {
  attachment: DirectChatAttachment;
  own?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPlayingRef = useRef(false);
  const durationHackDoneRef = useRef(false);
  const [src, setSrc] = useState<string | null>(
    attachment.url.startsWith("blob:") || attachment.url.startsWith("data:")
      ? attachment.url
      : null,
  );
  const [loading, setLoading] = useState(!src);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(
    Number.isFinite(attachment.duration) && (attachment.duration || 0) > 0
      ? Number(attachment.duration)
      : 0,
  );
  const [peaks, setPeaks] = useState(() => normalizePeaks(attachment.waveform));

  useEffect(() => {
    if (Number.isFinite(attachment.duration) && (attachment.duration || 0) > 0) {
      setDuration(Number(attachment.duration));
    }
    if (attachment.waveform?.length) {
      setPeaks(normalizePeaks(attachment.waveform));
    }
  }, [attachment.duration, attachment.waveform]);

  useEffect(() => {
    if (src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setFailed(false);

    void createChatAttachmentObjectUrl(attachment.url, attachment.mimeType, attachment.fileName)
      .then((url) => {
        if (cancelled) return;
        objectUrl = url.startsWith("blob:") ? url : null;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url, attachment.mimeType, attachment.fileName, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    durationHackDoneRef.current = false;
    userPlayingRef.current = false;

    const applyKnownDuration = () => {
      const meta = audio.duration;
      if (Number.isFinite(meta) && meta > 0 && meta !== Infinity) {
        setDuration(meta);
        return true;
      }
      if (Number.isFinite(attachment.duration) && (attachment.duration || 0) > 0) {
        setDuration(Number(attachment.duration));
        return true;
      }
      return false;
    };

    const onTime = () => setCurrent(audio.currentTime || 0);
    const onMeta = () => {
      if (applyKnownDuration()) {
        durationHackDoneRef.current = true;
        return;
      }
      // Never seek while the user is listening — that caused pause/unpause loops.
      if (userPlayingRef.current || !audio.paused || durationHackDoneRef.current) {
        return;
      }
      if (Number.isFinite(attachment.duration) && (attachment.duration || 0) > 0) {
        setDuration(Number(attachment.duration));
        durationHackDoneRef.current = true;
        return;
      }
      // WebM from MediaRecorder often reports Infinity until we force a one-time seek.
      try {
        durationHackDoneRef.current = true;
        const onDurationHack = () => {
          audio.removeEventListener("timeupdate", onDurationHack);
          if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) {
            setDuration(audio.duration);
          }
          if (!userPlayingRef.current && audio.paused) {
            try {
              audio.currentTime = 0;
            } catch {
              // ignore
            }
          }
        };
        audio.addEventListener("timeupdate", onDurationHack);
        audio.currentTime = 1e101;
      } catch {
        applyKnownDuration();
      }
    };
    const onPlay = () => {
      userPlayingRef.current = true;
      setPlaying(true);
    };
    const onPause = () => {
      // Ignore pause events caused by metadata seeks before the user pressed play.
      if (!userPlayingRef.current) return;
      setPlaying(false);
    };
    const onEnded = () => {
      userPlayingRef.current = false;
      setPlaying(false);
      setCurrent(0);
      if (activeVoicePlayer === audio) activeVoicePlayer = null;
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    applyKnownDuration();

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      if (activeVoicePlayer === audio) {
        audio.pause();
        activeVoicePlayer = null;
      }
    };
  }, [src, attachment.duration]);

  // Build waveform from decoded audio when message has none stored.
  // Skip while this note is actively playing so we don't fight the audio session.
  useEffect(() => {
    if (!src || attachment.waveform?.length || playing) return;
    let cancelled = false;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    void (async () => {
      try {
        const response = await fetch(src);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        if (cancelled) {
          void ctx.close();
          return;
        }
        if ((!duration || duration <= 0) && Number.isFinite(decoded.duration) && decoded.duration > 0) {
          setDuration(decoded.duration);
        }
        const channel = decoded.getChannelData(0);
        const samples: number[] = [];
        const step = Math.max(1, Math.floor(channel.length / (VOICE_WAVEFORM_BARS * 8)));
        for (let i = 0; i < channel.length; i += step) {
          samples.push(Math.min(1, Math.abs(channel[i]) * 2.2));
        }
        setPeaks(downsamplePeaks(samples));
        void ctx.close();
      } catch {
        // Keep placeholder peaks.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, attachment.waveform, duration, playing]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex min-w-[12rem] items-center gap-2 rounded-full px-3 py-2",
          own ? "bg-white/15" : "bg-black/5",
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin opacity-70" />
        <span className="text-xs opacity-80">Voice message</span>
      </div>
    );
  }

  if (!src || failed) {
    return (
      <div
        className={cn(
          "rounded-full px-3 py-2 text-xs",
          own ? "bg-white/15" : "bg-black/5",
        )}
      >
        Voice message unavailable
      </div>
    );
  }

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const displaySeconds = playing || current > 0.05 ? current : duration;

  return (
    <div
      className={cn(
        "flex min-w-[14.5rem] max-w-full items-center gap-2 rounded-full px-2 py-1.5",
        own ? "bg-white/15" : "bg-black/5",
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          audio.setAttribute("playsinline", "true");
          audio.setAttribute("webkit-playsinline", "true");
          if (!audio.paused) {
            userPlayingRef.current = false;
            audio.pause();
            setPlaying(false);
            return;
          }
          claimActiveVoicePlayer(audio);
          userPlayingRef.current = true;
          setPlaying(true);
          void audio.play().catch(() => {
            userPlayingRef.current = false;
            setPlaying(false);
          });
        }}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          own ? "bg-white/25 text-white" : "bg-sky-500 text-white",
        )}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <VoiceWaveform
          peaks={peaks}
          progress={progress}
          own={own}
          onSeek={(ratio) => {
            const audio = audioRef.current;
            if (!audio || !(duration > 0)) return;
            audio.currentTime = ratio * duration;
            setCurrent(audio.currentTime);
          }}
        />
        <p className={cn("mt-0.5 text-[10px] tabular-nums", own ? "text-white/80" : "text-gray-500")}>
          {formatDuration(displaySeconds)}
        </p>
      </div>
    </div>
  );
}

/** Only one voice note should play at a time (mobile audio session). */
let activeVoicePlayer: HTMLAudioElement | null = null;

function claimActiveVoicePlayer(audio: HTMLAudioElement) {
  if (activeVoicePlayer && activeVoicePlayer !== audio) {
    try {
      activeVoicePlayer.pause();
    } catch {
      // ignore
    }
  }
  activeVoicePlayer = audio;
}

type ChatVoiceRecorderProps = {
  disabled?: boolean;
  className?: string;
  recordingLabel: string;
  cancelLabel: string;
  sendLabel: string;
  micLabel: string;
  permissionDeniedLabel: string;
  /** @deprecated Hold gestures removed — tap to record / tap to send. */
  holdHintLabel?: string;
  /** @deprecated */
  slideUpLockLabel?: string;
  /** @deprecated */
  slideCancelLabel?: string;
  /** Hint shown while recording (default: tap send when done). */
  lockedLabel?: string;
  /** @deprecated */
  releaseToSendLabel?: string;
  onError: (message: string) => void;
  onSend: (payload: VoiceNoteSendPayload) => void | Promise<void>;
  onRecordingChange?: (recording: boolean) => void;
};

export function ChatVoiceRecorderButton({
  disabled,
  className,
  recordingLabel,
  cancelLabel,
  sendLabel,
  micLabel,
  permissionDeniedLabel,
  holdHintLabel = "Tap to record",
  lockedLabel = "Recording — tap send when done",
  onError,
  onSend,
  onRecordingChange,
}: ChatVoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelSamplesRef = useRef<number[]>([]);
  const liveBarsRef = useRef<number[]>(normalizePeaks(undefined));
  const startingRef = useRef(false);
  const finishingRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [livePeaks, setLivePeaks] = useState(() => normalizePeaks(undefined));

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearTick = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopAnalyser = () => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTick();
      stopAnalyser();
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
      stopTracks();
    };
  }, []);

  const startLevelMonitor = (stream: MediaStream) => {
    stopAnalyser();
    levelSamplesRef.current = [];
    liveBarsRef.current = normalizePeaks(undefined);
    setLivePeaks(liveBarsRef.current);

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.55;
    source.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      const node = analyserRef.current;
      if (!node) return;
      node.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sum / data.length) * 3.4);
      levelSamplesRef.current.push(rms);

      const next = liveBarsRef.current.slice(1);
      next.push(Math.max(0.08, rms));
      liveBarsRef.current = next;
      setLivePeaks(next);

      rafRef.current = window.requestAnimationFrame(tick);
    };

    void ctx.resume().catch(() => undefined);
    rafRef.current = window.requestAnimationFrame(tick);
  };

  const finishRecording = (action: "send" | "cancel") => {
    if (finishingRef.current) return;
    const recorder = mediaRecorderRef.current;
    const durationSec = Math.max(0, (Date.now() - startedAtRef.current) / 1000);
    const waveform = downsamplePeaks(levelSamplesRef.current);

    if (!recorder || recorder.state === "inactive") {
      stopAnalyser();
      setRecording(false);
      onRecordingChange?.(false);
      clearTick();
      stopTracks();
      return;
    }

    finishingRef.current = true;
    // Prevent double-send if send is tapped twice quickly.
    mediaRecorderRef.current = null;

    recorder.onstop = () => {
      finishingRef.current = false;
      clearTick();
      stopAnalyser();
      stopTracks();
      setRecording(false);
      onRecordingChange?.(false);
      const format = pickVoiceRecordingFormat();
      const mimeType =
        recorder.mimeType || format.mimeType || chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
      chunksRef.current = [];

      if (action === "cancel" || blob.size < 400 || durationSec < 0.4) return;

      const extension =
        mimeType.includes("mp4") || mimeType.includes("m4a")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
      const file = new File([blob], `voice-${Date.now()}.${extension}`, {
        type: blob.type || `audio/${extension === "m4a" ? "mp4" : extension}`,
      });

      setBusy(true);
      void Promise.resolve(
        onSend({
          file,
          duration: Math.max(1, Math.round(durationSec)),
          waveform,
        }),
      ).finally(() => setBusy(false));
    };

    try {
      recorder.stop();
    } catch {
      finishingRef.current = false;
      stopAnalyser();
      setRecording(false);
      onRecordingChange?.(false);
      clearTick();
      stopTracks();
    }
  };

  const startRecording = async () => {
    if (disabled || recording || busy || startingRef.current || finishingRef.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onError("Voice recording is not supported on this device.");
      return;
    }

    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const format = pickVoiceRecordingFormat();
      const recorder = format.mimeType
        ? new MediaRecorder(stream, { mimeType: format.mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      startLevelMonitor(stream);
      recorder.start(250);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      onRecordingChange?.(true);
      clearTick();
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 200);
      try {
        navigator.vibrate?.(8);
      } catch {
        // ignore
      }
    } catch {
      stopAnalyser();
      stopTracks();
      onError(permissionDeniedLabel);
    } finally {
      startingRef.current = false;
    }
  };

  if (recording) {
    return (
      <div
        className={cn("relative z-30 flex w-full min-w-0 flex-col gap-1.5", className)}
        data-chat-voice-recording="true"
        aria-live="polite"
      >
        <div className="flex w-full items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2.5 shadow-none">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div className="min-w-0 flex-1">
            <VoiceWaveform peaks={livePeaks} live />
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-sky-700">
              {`${recordingLabel} · ${formatDuration(elapsed)}`}
            </p>
            <p className="text-[10px] font-medium text-sky-600/90">{lockedLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => finishRecording("cancel")}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-100 disabled:opacity-40"
            aria-label={cancelLabel}
            title={cancelLabel}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => finishRecording("send")}
            disabled={busy || elapsed < 1}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow disabled:opacity-40"
            aria-label={sendLabel}
            title={sendLabel}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} className="translate-x-px" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void startRecording()}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-sky-100 hover:text-sky-700 disabled:opacity-40",
        "select-none [-webkit-touch-callout:none] [-webkit-user-select:none]",
        className,
      )}
      aria-label={`${micLabel}. ${holdHintLabel}.`}
      title={`${micLabel} — ${holdHintLabel}`}
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
    </button>
  );
}

export function attachmentIsVoiceNote(attachment: DirectChatAttachment) {
  return isChatAudioAttachment(attachment.mimeType, attachment.fileName);
}
