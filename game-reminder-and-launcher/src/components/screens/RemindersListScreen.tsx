"use client";

import { useState, useEffect } from "react";
import type { Reminder } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { IconBell, IconClock, IconPlus, IconCheck, IconRepeat } from "@/components/Icons";
import { cn, formatShortTime, formatShortDate, formatReminderTime, getRepeatLabel, getNotificationTypeLabel } from "@/lib/utils";

interface RemindersListScreenProps {
  onViewReminder: (id: string) => void;
  onAddReminder: () => void;
}

type Filter = "active" | "completed" | "all";

export function RemindersListScreen({ onViewReminder, onAddReminder }: RemindersListScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");

  useEffect(() => { fetchReminders(); }, []);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/reminders");
      setReminders(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = reminders.filter((r) => {
    if (filter === "active") return !r.completed && !r.dismissed;
    if (filter === "completed") return r.completed || r.dismissed;
    return true;
  });

  return (
    <div className="px-5 pt-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary">Reminders</h1>
          <p className="text-[12px] text-text-muted mt-0.5">{reminders.filter(r => !r.completed && !r.dismissed).length} active reminders</p>
        </div>
        <button onClick={onAddReminder} className="btn-accent w-9 h-9 rounded-xl flex items-center justify-center">
          <IconPlus size={18} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-bg-card rounded-xl border border-border mb-4">
        {(["active", "completed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all capitalize",
              filter === f ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-secondary"
            )}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><IconClock size={24} className="text-accent animate-pulse" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center mx-auto mb-3">
            <IconBell size={24} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">No {filter} reminders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <button key={r.id} onClick={() => onViewReminder(r.id)}
              className={cn("w-full card-base rounded-2xl p-3.5 flex items-center gap-3 text-left anim-slide-up", `delay-${Math.min(i + 1, 5)}`,
                (r.completed || r.dismissed) && "opacity-50"
              )}>
              <GameIcon game={r.game} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {r.game && <span className="text-[10px] font-semibold" style={{ color: r.game.color }}>{r.game.name}</span>}
                  {r.repeatRule !== "none" && <IconRepeat size={10} className="text-text-muted" />}
                </div>
                <h3 className={cn("text-[13px] font-semibold text-text-primary truncate", (r.completed || r.dismissed) && "line-through")}>{r.title}</h3>
                <p className="text-[11px] text-text-muted mt-0.5">{r.category?.icon} {r.category?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.completed || r.dismissed ? (
                  <div className="flex items-center gap-1 text-success text-xs"><IconCheck size={12} /> Done</div>
                ) : (
                  <>
                    <p className="text-[12px] font-semibold text-text-secondary">{formatShortTime(r.scheduledDateTime)}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{formatShortDate(r.scheduledDateTime)}</p>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
