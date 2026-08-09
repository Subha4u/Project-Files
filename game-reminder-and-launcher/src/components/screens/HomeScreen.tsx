"use client";

import { useState, useEffect } from "react";
import type { Reminder } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { SnoozePicker } from "@/components/SnoozePicker";
import { Toast, useToast } from "@/components/Toast";
import { IconPlus, IconPlay, IconClock, IconX, IconRepeat } from "@/components/Icons";
import { cn, timeAgo, formatShortTime, formatShortDate, getRepeatLabel } from "@/lib/utils";
import {
  openGame,
  scheduleReminder,
  cancelReminderNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from "@/lib/reminder-engine";

interface HomeScreenProps {
  onAddReminder: () => void;
  onViewReminder: (id: string) => void;
  onRefresh: () => void;
}

export function HomeScreen({ onAddReminder, onViewReminder, onRefresh }: HomeScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [snoozeTarget, setSnoozeTarget] = useState<string | null>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    fetchReminders();
  }, []);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setReminders(data);

      // Schedule notifications for pending reminders
      for (const r of data) {
        if (r.isPending && r.enabled && !r.completed && !r.dismissed) {
          await scheduleReminder(r);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoading(false);
    }
  }

  async function dismissReminder(id: string) {
    try {
      await cancelReminderNotification(id);
      await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      showToast("Reminder dismissed", "success");
      fetchReminders();
    } catch (err) {
      showToast("Failed to dismiss reminder", "error");
    }
  }

  async function handleSnooze(id: string, minutes: number) {
    try {
      const res = await fetch(`/api/reminders/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: minutes }),
      });
      const updated = await res.json();

      // Reschedule notification for snoozed time
      if (updated.snoozedUntil) {
        await scheduleReminder({
          ...updated,
          scheduledDateTime: updated.snoozedUntil,
        });
      }

      showToast(`Snoozed for ${minutes} minutes`, "success");
      setSnoozeTarget(null);
      fetchReminders();
    } catch (err) {
      showToast("Failed to snooze", "error");
    }
  }

  function handleOpenGame(r: Reminder) {
    if (!r.game?.packageId) {
      showToast("No game package configured", "error");
      return;
    }

    const result = openGame(r.game.packageId);
    if (result.success) {
      if (result.method === "store") {
        showToast("Opening game store...", "info");
      }
    } else {
      showToast(result.error || "Could not open game", "error");
    }
  }

  const overdue = reminders.filter((r) => r.isOverdue);
  const today = reminders.filter((r) => r.isToday);
  const upcoming = reminders.filter((r) => r.isUpcoming);
  const notificationPermission = getNotificationPermission();

  return (
    <div className="relative">
      {/* Notification permission banner */}
      {notificationPermission === "default" && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            <IconClock size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-text-primary">Enable Notifications</p>
            <p className="text-[11px] text-text-muted">Get alerts when reminders are due</p>
          </div>
          <button
            onClick={async () => {
              const perm = await requestNotificationPermission();
              if (perm === "granted") {
                showToast("Notifications enabled!", "success");
                fetchReminders();
              } else if (perm === "denied") {
                showToast("Notifications blocked by browser", "error");
              }
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent text-white"
          >
            Enable
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[1.65rem] font-extrabold tracking-tight gradient-text leading-tight">GameReminder</h1>
            <p className="text-[13px] text-text-muted mt-1">Your games. Your schedule.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-bg-card border border-border flex items-center justify-center mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted">
              <rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="17" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/>
            </svg>
          </div>
        </div>

        {/* Quick stats */}
        {!loading && reminders.length > 0 && (
          <div className="flex gap-2 mt-4 anim-fade">
            {overdue.length > 0 && (
              <div className="flex items-center gap-1.5 bg-overdue/8 border border-overdue/15 text-overdue text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-overdue animate-pulse" />
                {overdue.length} overdue
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-accent-dim border border-accent/15 text-accent text-xs font-medium px-3 py-1.5 rounded-full">
              {today.length} today
            </div>
            <div className="flex items-center gap-1.5 bg-upcoming-dim border border-upcoming/15 text-upcoming text-xs font-medium px-3 py-1.5 rounded-full">
              {upcoming.length} upcoming
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-[#c084fc]/20 flex items-center justify-center mb-4">
            <IconClock size={24} className="text-accent animate-pulse" />
          </div>
          <p className="text-sm text-text-muted">Loading reminders…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && reminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center anim-scale">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/15 to-[#c084fc]/10 border border-accent/10 flex items-center justify-center mb-5">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">No Reminders Yet</h2>
          <p className="text-sm text-text-muted mb-6 max-w-[260px]">Create your first game reminder and never miss an event again.</p>
          <button onClick={onAddReminder} className="btn-accent px-6 py-3 rounded-2xl text-sm flex items-center gap-2">
            <IconPlus size={16} /> Add Reminder
          </button>
        </div>
      )}

      {/* Reminder Sections */}
      {!loading && reminders.length > 0 && (
        <div className="px-5 space-y-6 pb-4">
          {/* OVERDUE */}
          {overdue.length > 0 && (
            <section>
              <SectionHeader color="overdue" label="Overdue" count={overdue.length} pulse />
              <div className="space-y-3 mt-3">
                {overdue.map((r, i) => (
                  <OverdueCard
                    key={r.id}
                    reminder={r}
                    index={i}
                    onView={() => onViewReminder(r.id)}
                    onOpen={() => handleOpenGame(r)}
                    onSnooze={() => setSnoozeTarget(r.id)}
                    onDismiss={() => dismissReminder(r.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* TODAY */}
          {today.length > 0 && (
            <section>
              <SectionHeader color="today" label="Today" count={today.length} />
              <div className="space-y-2.5 mt-3">
                {today.map((r, i) => (
                  <CompactCard key={r.id} reminder={r} index={i} variant="today" onView={() => onViewReminder(r.id)} />
                ))}
              </div>
            </section>
          )}

          {/* UPCOMING */}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader color="upcoming" label="Upcoming" count={upcoming.length} />
              <div className="space-y-2.5 mt-3">
                {upcoming.map((r, i) => (
                  <CompactCard key={r.id} reminder={r} index={i} variant="upcoming" onView={() => onViewReminder(r.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={onAddReminder}
        className="fab fixed bottom-[5.5rem] right-5 max-w-lg w-14 h-14 rounded-2xl flex items-center justify-center z-40 text-white"
        title="Add Reminder"
      >
        <IconPlus size={26} />
      </button>

      {/* Snooze Picker */}
      <SnoozePicker
        isOpen={!!snoozeTarget}
        onSelect={(mins) => snoozeTarget && handleSnooze(snoozeTarget, mins)}
        onClose={() => setSnoozeTarget(null)}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}

/* ── Sub-components ───────────────────────── */

function SectionHeader({ color, label, count, pulse }: { color: string; label: string; count: number; pulse?: boolean }) {
  const colors: Record<string, string> = { overdue: "bg-overdue", today: "bg-accent", upcoming: "bg-upcoming" };
  const textColors: Record<string, string> = { overdue: "text-overdue", today: "text-accent", upcoming: "text-upcoming" };
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("section-dot", colors[color], pulse && "animate-pulse")} />
      <h2 className={cn("text-xs font-bold uppercase tracking-[0.08em]", textColors[color])}>{label}</h2>
      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", `${textColors[color]} bg-${color}/10`)}>{count}</span>
    </div>
  );
}

function OverdueCard({ reminder: r, index, onView, onOpen, onSnooze, onDismiss }: {
  reminder: Reminder; index: number;
  onView: () => void; onOpen: () => void; onSnooze: () => void; onDismiss: () => void;
}) {
  return (
    <div onClick={onView} className={cn("card-overdue anim-glow rounded-2xl p-4 cursor-pointer anim-slide-up", `delay-${index + 1}`)}>
      <div className="flex items-start gap-3.5">
        <GameIcon game={r.game} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {r.game && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${r.game.color}18`, color: r.game.color }}>
                {r.game.name}
              </span>
            )}
            {r.category && <span className="text-[11px] text-text-muted">{r.category.icon} {r.category.name}</span>}
          </div>
          <h3 className="text-[15px] font-bold text-text-primary leading-snug">{r.title}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-overdue flex items-center gap-1">
              <IconClock size={12} /> Due {timeAgo(r.scheduledDateTime)}
            </span>
            {r.repeatRule !== "none" && (
              <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                <IconRepeat size={10} /> {getRepeatLabel(r.repeatRule)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-overdue/10">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="flex-1 btn-accent py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-1.5"
        >
          <IconPlay size={13} /> Open Game
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSnooze(); }}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-medium bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all flex items-center justify-center gap-1.5"
        >
          <IconClock size={13} /> Snooze
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="w-10 h-10 rounded-xl bg-bg-elevated border border-border text-text-muted hover:text-overdue hover:border-overdue/30 transition-all flex items-center justify-center flex-shrink-0"
        >
          <IconX size={15} />
        </button>
      </div>
    </div>
  );
}

function CompactCard({ reminder: r, index, variant, onView }: {
  reminder: Reminder; index: number; variant: "today" | "upcoming"; onView: () => void;
}) {
  const borderAccent = variant === "today" ? "hover:border-accent/25" : "hover:border-upcoming/25";
  return (
    <div
      onClick={onView}
      className={cn("card-base rounded-2xl p-3.5 cursor-pointer flex items-center gap-3.5 anim-slide-up", borderAccent, `delay-${index + 1}`)}
    >
      <GameIcon game={r.game} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {r.game && <span className="text-[10px] font-semibold" style={{ color: r.game.color }}>{r.game.name}</span>}
          {r.repeatRule !== "none" && <IconRepeat size={10} className="text-text-muted" />}
          {r.notificationType === "alarm" && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-warning">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          )}
        </div>
        <h3 className="text-[14px] font-semibold text-text-primary truncate leading-snug">{r.title}</h3>
        <p className="text-[11px] text-text-muted mt-0.5">{r.category?.icon} {r.category?.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("text-[13px] font-semibold", variant === "today" ? "text-accent" : "text-upcoming")}>
          {formatShortTime(r.scheduledDateTime)}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">{formatShortDate(r.scheduledDateTime)}</p>
      </div>
    </div>
  );
}
