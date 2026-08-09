"use client";

import { useState, useEffect } from "react";
import { GameIcon } from "./GameIcon";
import { IconPlay, IconClock, IconX } from "./Icons";
import { SNOOZE_OPTIONS, openGame } from "@/lib/reminder-engine";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/types";

interface AlarmModalProps {
  isOpen: boolean;
  reminderId: string;
  title: string;
  gameName: string;
  gameIcon?: string;
  gameColor?: string;
  gamePackageId?: string;
  scheduledTime: Date;
  onOpenGame: () => void;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
}

export function AlarmModal({
  isOpen,
  reminderId,
  title,
  gameName,
  gameIcon,
  gameColor,
  gamePackageId,
  scheduledTime,
  onOpenGame,
  onSnooze,
  onDismiss,
}: AlarmModalProps) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);

  // Vibrate on open (if supported)
  useEffect(() => {
    if (isOpen && typeof navigator !== "undefined" && "vibrate" in navigator) {
      // Vibrate pattern: 200ms on, 100ms off, repeat
      const pattern = [200, 100, 200, 100, 200, 100, 200];
      navigator.vibrate(pattern);
      setIsVibrating(true);

      // Continue vibrating every 2 seconds
      const interval = setInterval(() => {
        navigator.vibrate(pattern);
      }, 2000);

      return () => {
        clearInterval(interval);
        navigator.vibrate(0); // Stop vibration
        setIsVibrating(false);
      };
    }
  }, [isOpen]);

  // Play alarm sound (using Web Audio API)
  useEffect(() => {
    if (!isOpen) return;

    let audioContext: AudioContext | null = null;
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;

    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      // Pulsing effect
      const pulse = () => {
        if (!audioContext || !oscillator || !gainNode) return;
        const now = audioContext.currentTime;
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.setValueAtTime(660, now + 0.2);
        oscillator.frequency.setValueAtTime(880, now + 0.4);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0, now + 0.6);
        gainNode.gain.setValueAtTime(0.3, now + 0.8);
      };

      oscillator.start();
      pulse();

      const interval = setInterval(pulse, 1200);

      return () => {
        clearInterval(interval);
        oscillator?.stop();
        audioContext?.close();
      };
    } catch {
      // Audio not supported
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fakeGame: Game = {
    id: "",
    name: gameName,
    iconUrl: gameIcon || "",
    color: gameColor || "#7c5cfc",
    packageId: gamePackageId || "",
    createdAt: "",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop with pulsing effect */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-pulse" />

      {/* Alarm content */}
      <div className="relative z-10 w-full max-w-sm mx-4 anim-scale">
        {/* Pulsing ring */}
        <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-overdue/30 to-overdue/10 animate-ping opacity-75" />

        <div className="relative bg-gradient-to-br from-[#1a0f14] to-[#150d12] rounded-3xl border border-overdue/30 p-6 shadow-2xl shadow-overdue/20">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-overdue/15 border border-overdue/20 mb-4">
              <div className="w-2 h-2 rounded-full bg-overdue animate-pulse" />
              <span className="text-xs font-bold text-overdue uppercase tracking-wider">Alarm</span>
            </div>

            <div className="mx-auto mb-4">
              <GameIcon game={fakeGame} size="xl" className="mx-auto ring-4 ring-overdue/20" />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-1">{title}</h2>
            <p className="text-sm text-text-secondary">{gameName}</p>
            <p className="text-xs text-text-muted mt-2">
              Scheduled for {scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Actions */}
          {!showSnoozeOptions ? (
            <div className="space-y-2.5">
              {gamePackageId && (
                <button
                  onClick={() => {
                    onOpenGame();
                    navigator.vibrate?.(0);
                  }}
                  className="w-full btn-accent py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
                >
                  <IconPlay size={18} /> Open {gameName}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setShowSnoozeOptions(true)}
                  className="py-3.5 rounded-2xl text-sm font-semibold bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all flex items-center justify-center gap-2"
                >
                  <IconClock size={15} /> Snooze
                </button>
                <button
                  onClick={() => {
                    navigator.vibrate?.(0);
                    onDismiss();
                  }}
                  className="py-3.5 rounded-2xl text-sm font-semibold bg-bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-border transition-all flex items-center justify-center gap-2"
                >
                  <IconX size={15} /> Dismiss
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted text-center mb-2">Snooze for:</p>
              <div className="grid grid-cols-2 gap-2">
                {SNOOZE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      navigator.vibrate?.(0);
                      onSnooze(value);
                      setShowSnoozeOptions(false);
                    }}
                    className="py-3 rounded-xl text-sm font-semibold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSnoozeOptions(false)}
                className="w-full py-2.5 text-xs text-text-muted hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
