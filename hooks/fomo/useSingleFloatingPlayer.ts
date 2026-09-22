"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  videoId: string;
  hasAudio: boolean;
  onRequestAudio: () => void;
};

export function useSingleFloatingPlayer({ videoId, hasAudio, onRequestAudio }: Options) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isSeekingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const prevVolumeRef = useRef(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverLeft, setHoverLeft] = useState<number | null>(null);

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  const sendListening = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
  }, []);

  const syncVolume = useCallback(
    (nextVolume: number, audible: boolean) => {
      const clamped = Math.max(0, Math.min(100, Math.round(nextVolume)));
      if (!audible || clamped <= 0) {
        sendCommand("mute");
        sendCommand("setVolume", [0]);
        return;
      }
      sendCommand("unMute");
      sendCommand("setVolume", [clamped]);
    },
    [sendCommand],
  );

  const handleIframeReady = useCallback(() => {
    setTimeout(() => {
      sendCommand("playVideo");
      syncVolume(volume, hasAudio);
      sendListening();
    }, 600);
  }, [sendCommand, sendListening, syncVolume, volume, hasAudio]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "infoDelivery" && data.info) {
          const { currentTime: cTime, duration: dur } = data.info;
          if (cTime !== undefined && !isSeekingRef.current) setCurrentTime(cTime);
          if (dur !== undefined) setDuration(dur);
        }
      } catch {
        // ignore unrelated messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!videoId) return;
    const interval = setInterval(sendListening, 1000);
    return () => clearInterval(interval);
  }, [videoId, sendListening]);

  useEffect(() => {
    if (!videoId) return;
    const t = setTimeout(() => syncVolume(volume, hasAudio), 200);
    return () => clearTimeout(t);
  }, [videoId, hasAudio, volume, syncVolume]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    setSpeed(1);
  }, [videoId]);

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const changeSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    sendCommand("setPlaybackRate", [nextSpeed]);
    setSpeed(nextSpeed);
  };

  const changeVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    if (!hasAudio && clamped > 0) onRequestAudio();
    setVolume(clamped);
    syncVolume(clamped, hasAudio || clamped > 0);
  };

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      changeVolume(0);
    } else {
      if (!hasAudio) onRequestAudio();
      changeVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 50);
    }
  };

  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 15);
    setCurrentTime(newTime);
    sendCommand("seekTo", [newTime, true]);
  };

  const handleForward = () => {
    if (!duration) return;
    const newTime = Math.min(duration, currentTime + 15);
    setCurrentTime(newTime);
    sendCommand("seekTo", [newTime, true]);
  };

  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    setHoverLeft(null);
    if (duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setCurrentTime(pct * duration);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isSeekingRef.current) setCurrentTime(pct * duration);
    else setHoverLeft(pct * 100);
  };

  const handleSeekEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    sendCommand("seekTo", [newTime, true]);
    setIsSeeking(false);
    setHoverLeft(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  };

  const formatTime = (seconds: number) => {
    if (Number.isNaN(seconds) || seconds === Infinity) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : m;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  return {
    iframeRef,
    isPlaying,
    speed,
    volume,
    currentTime,
    duration,
    isSeeking,
    hoverLeft,
    setHoverLeft,
    togglePlay,
    changeSpeed,
    changeVolume,
    toggleMute,
    handleRewind,
    handleForward,
    handleSeekStart,
    handleSeekMove,
    handleSeekEnd,
    handleIframeReady,
    formatTime,
  };
}
