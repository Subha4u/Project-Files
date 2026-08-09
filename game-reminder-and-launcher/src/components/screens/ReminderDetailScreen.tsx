"use client";

import { useState, useEffect } from "react";
import type { Reminder } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { SnoozePicker } from "@/components/SnoozePicker";
import { Toast, useToast } from "@/components/Toast";
import {
  IconArrowLeft,
  IconPlay,
  IconEdit,
  IconTrash,
  IconCheck,
  IconClock,
  IconCalendar,
  IconRepeat,
  IconBell,
  IconAlarm,
} from "@/components/Icons";
import { formatReminderTime, getRepeatLabel, getNotificationTypeLabel, cn, timeAgo } from "@/lib/utils";
import {
  openGame,
  cancelReminderNotification,
  scheduleReminder,
  calculateNextOccurrence,
} from "@/lib/reminder-engine";

interface ReminderDetailScreenProps {
  id: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function ReminderDetailScreen({ id, onBack, onEdit }: ReminderDetailScreenProps) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    fetch(`/api/reminders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setReminder(data);
        setLoading(false);
      });
  }, [id]);

  async function toggleEnabled() {
    if (!reminder) return;
    try {
      const newEnabled = !reminder.enabled;
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const updated = await res.json();

      if (newEnabled) {
        // Reschedule the notification
        await scheduleReminder({
          ...reminder,
          ...updated,
          enabled: true,
        });
        showToast("Reminder enabled", "success");
      } else {
        // Cancel the notification
        await cancelReminderNotification(id);
        showToast("Reminder paused", "info");
      }

      setReminder({ ...reminder, ...updated });
    } catch (err) {
      showToast("Failed to update", "error");
    }
  }

  async function handleSnooze(minutes: number) {
    if (!reminder) return;
    try {
      const res = await fetch(`/api/reminders/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: minutes }),
      });
      const updated = await res.json();

      // Reschedule notification for snoozed time
      await scheduleReminder({
        ...reminder,
        ...updated,
        scheduledDateTime: updated.snoozedUntil,
      });

      showToast(`Snoozed for ${minutes} minutes`, "success");
      setShowSnoozePicker(false);
      setReminder({ ...reminder, ...updated });
    } catch (err) {
      showToast("Failed to snooze", "error");
    }
  }

  async function markComplete() {
    if (!reminder) return;
    try {
      // Cancel the notification
      await cancelReminderNotification(id);

      // Mark as completed
      await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      // If recurring, calculate and show next occurrence
      if (reminder.repeatRule !== "none") {
        const nextDate = calculateNextOccurrence(
          new Date(reminder.scheduledDateTime),
          reminder.repeatRule,
          reminder.customRepeatDays
        );
        if (nextDate) {
          showToast(`Next: ${formatReminderTime(nextDate.toISOString())}`, "success");
        }
      } else {
        showToast("Reminder completed", "success");
      }

      // Navigate back after short delay
      setTimeout(onBack, 1000);
    } catch (err) {
      showToast("Failed to complete", "error");
    }
  }

  async function deleteReminder() {
    setDeleting(true);
    try {
      // Cancel the notification
      await cancelReminderNotification(id);

      // Delete from database
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      showToast("Reminder deleted", "success");
      setTimeout(onBack, 500);
    } catch (err) {
      showToast("Failed to delete", "error");
      setDeleting(false);
    }
  }

  function handleOpenGame() {
    if (!reminder?.game?.packageId) {
      showToast("No game package configured", "error");
      return;
    }

    const result = openGame(reminder.game.packageId);
    if (result.success) {
      if (result.method === "store") {
        showToast("Opening game store...", "info");
      }
    } else {
      showToast(result.error || "Could not open game", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <IconClock size={28} className="text-accent animate-pulse" />
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="px-5 pt-6">
        <button onClick={onBack} className="text-text-muted text-sm flex items-center gap-1">
          <IconArrowLeft size={14} /> Back
        </button>
        <p className="text-text-muted mt-4">Reminder not found.</p>
      </div>
    );
  }

  const game = reminder.game;
  const isOverdue =
    new Date(reminder.snoozedUntil || reminder.scheduledDateTime) < new Date() &&
    !reminder.completed &&
    !reminder.dismissed &&
    reminder.enabled;

  return (
    <div className="px-5 pt-6 pb-6 anim-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <IconArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-text-primary flex-1">Details</h1>
        <button
          onClick={toggleEnabled}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
            reminder.enabled
              ? "bg-success/12 text-success border border-success/20"
              : "bg-warning/12 text-warning border border-warning/20"
          )}
        >
          {reminder.enabled ? "Active" : "Paused"}
        </button>
      </div>

      {/* Hero card */}
      <div className={cn("rounded-2xl p-5 mb-4", isOverdue ? "card-overdue anim-glow" : "card-base")}>
        <div className="flex items-center gap-4 mb-4">
          <GameIcon game={game} size="xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-text-primary leading-tight">{reminder.title}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{game?.name}</p>
            {isOverdue && (
              <p className="text-xs font-semibold text-overdue mt-1.5 flex items-center gap-1">
                <IconClock size={12} /> Due {timeAgo(reminder.scheduledDateTime)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <DetailRow
            icon={<span className="text-sm">{reminder.category?.icon || "📁"}</span>}
            label="Category"
            value={`${reminder.category?.name || "Unknown"}${reminder.subcategory ? ` → ${reminder.subcategory.name}` : ""}`}
          />
          <DetailRow
            icon={<IconCalendar size={15} className="text-text-muted" />}
            label="Scheduled"
            value={formatReminderTime(reminder.scheduledDateTime)}
          />
          <DetailRow
            icon={<IconRepeat size={15} className="text-text-muted" />}
            label="Repeat"
            value={getRepeatLabel(reminder.repeatRule)}
          />
          <DetailRow
            icon={
              reminder.notificationType === "alarm" ? (
                <IconAlarm size={15} className="text-warning" />
              ) : (
                <IconBell size={15} className="text-accent" />
              )
            }
            label="Alert"
            value={getNotificationTypeLabel(reminder.notificationType)}
          />
          {reminder.snoozedUntil && (
            <DetailRow
              icon={<IconClock size={15} className="text-warning" />}
              label="Snoozed Until"
              value={formatReminderTime(reminder.snoozedUntil)}
            />
          )}
          {(reminder.triggerCount ?? 0) > 0 && (
            <DetailRow
              icon={<span className="text-xs">🔔</span>}
              label="Times Triggered"
              value={String(reminder.triggerCount)}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        {game?.packageId && (
          <button
            onClick={handleOpenGame}
            className="w-full btn-accent py-3.5 rounded-2xl text-[14px] flex items-center justify-center gap-2"
          >
            <IconPlay size={15} /> Open {game.name}
          </button>
        )}

        {isOverdue && (
          <button
            onClick={() => setShowSnoozePicker(true)}
            className="w-full py-3 rounded-2xl text-[13px] font-semibold bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all flex items-center justify-center gap-2"
          >
            <IconClock size={15} /> Snooze
          </button>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onEdit(id)}
            className="card-base py-3 rounded-2xl text-[13px] font-semibold text-text-primary flex items-center justify-center gap-2 hover:border-accent/30"
          >
            <IconEdit size={15} /> Edit
          </button>
          <button
            onClick={markComplete}
            className="py-3 rounded-2xl text-[13px] font-semibold text-success bg-success/8 border border-success/15 hover:bg-success/15 transition-all flex items-center justify-center gap-2"
          >
            <IconCheck size={15} /> Complete
          </button>
        </div>

        <button
          onClick={deleteReminder}
          disabled={deleting}
          className="w-full py-3 rounded-2xl text-[13px] font-semibold text-danger bg-danger/8 border border-danger/15 hover:bg-danger/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <IconTrash size={15} /> {deleting ? "Deleting…" : "Delete Reminder"}
        </button>
      </div>

      {/* Snooze Picker */}
      <SnoozePicker
        isOpen={showSnoozePicker}
        onSelect={handleSnooze}
        onClose={() => setShowSnoozePicker(false)}
      />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
