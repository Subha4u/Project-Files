"use client";

import { useState } from "react";
import { IconClock, IconX } from "./Icons";
import { SNOOZE_OPTIONS } from "@/lib/reminder-engine";
import { cn } from "@/lib/utils";

interface SnoozePickerProps {
  isOpen: boolean;
  onSelect: (minutes: number) => void;
  onClose: () => void;
}

export function SnoozePicker({ isOpen, onSelect, onClose }: SnoozePickerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Picker */}
      <div className="relative z-10 w-full max-w-lg mx-auto anim-slide-up">
        <div className="bg-bg-secondary rounded-t-3xl border-t border-x border-border p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IconClock size={18} className="text-accent" />
              <h3 className="text-base font-bold text-text-primary">Snooze for</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {SNOOZE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onSelect(value)}
                className="py-4 rounded-2xl text-base font-semibold bg-bg-card border border-border text-text-primary hover:border-accent/40 hover:bg-accent/5 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-accent">{value}</span> {value === 60 ? "hour" : "minutes"}
              </button>
            ))}
          </div>

          <p className="text-xs text-text-muted text-center mt-4">
            The reminder will trigger again at the snoozed time
          </p>
        </div>
      </div>
    </div>
  );
}
