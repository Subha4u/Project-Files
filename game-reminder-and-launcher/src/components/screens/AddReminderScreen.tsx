"use client";

import { useState, useEffect } from "react";
import type { Game, Category, Reminder } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { Toast, useToast } from "@/components/Toast";
import { IconArrowLeft, IconCheck, IconClock, IconCalendar, IconBell, IconAlarm, IconRepeat } from "@/components/Icons";
import { cn, formatShortTime, formatShortDate } from "@/lib/utils";
import { format } from "date-fns";
import {
  scheduleReminder,
  cancelReminderNotification,
  requestNotificationPermission,
  getNotificationPermission,
} from "@/lib/reminder-engine";

interface AddReminderScreenProps {
  editId?: string;
  onBack: () => void;
  onSaved: () => void;
}

const TOTAL_STEPS = 6;

export function AddReminderScreen({ editId, onBack, onSaved }: AddReminderScreenProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(Date.now() + 3600000), "HH:mm"));
  const [repeatRule, setRepeatRule] = useState("none");
  const [notificationType, setNotificationType] = useState("push");
  const [step, setStep] = useState(1);

  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/games").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([g, c]) => {
      setGames(g);
      setCategories(c);
      setLoading(false);
    });

    if (editId) {
      fetch(`/api/reminders/${editId}`)
        .then((r) => r.json())
        .then((rem: Reminder) => {
          setSelectedGameId(rem.gameId);
          setSelectedCategoryId(rem.categoryId);
          setSelectedSubcategoryId(rem.subcategoryId || "");
          setTitle(rem.title);
          const dt = new Date(rem.scheduledDateTime);
          setDate(format(dt, "yyyy-MM-dd"));
          setTime(format(dt, "HH:mm"));
          setRepeatRule(rem.repeatRule);
          setNotificationType(rem.notificationType);
          setStep(6);
        });
    }
  }, [editId]);

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const subcats = selectedCategory?.subcategories || [];
  const selectedSub = subcats.find((s) => s.id === selectedSubcategoryId);

  async function handleSave() {
    if (!selectedGameId || !selectedCategoryId || !title || !date || !time) return;
    setSaving(true);

    const scheduledDateTime = new Date(`${date}T${time}:00`).toISOString();
    const body = {
      gameId: selectedGameId,
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId || null,
      title,
      scheduledDateTime,
      repeatRule,
      notificationType,
    };

    try {
      // If editing, cancel the old notification first
      if (editId) {
        await cancelReminderNotification(editId);
      }

      let savedReminder: Reminder;

      if (editId) {
        const res = await fetch(`/api/reminders/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        savedReminder = await res.json();
      } else {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        savedReminder = await res.json();
      }

      // Schedule the notification
      const notifScheduled = await scheduleReminder({
        id: savedReminder.id,
        title: savedReminder.title,
        scheduledDateTime: savedReminder.scheduledDateTime,
        repeatRule: savedReminder.repeatRule,
        notificationType: savedReminder.notificationType,
        enabled: true,
        game: savedReminder.game || selectedGame || null,
        category: savedReminder.category || selectedCategory || null,
      });

      if (notifScheduled) {
        showToast(editId ? "Reminder updated" : "Reminder created", "success");
      } else if (new Date(scheduledDateTime) <= new Date()) {
        showToast("Reminder is in the past", "info");
      }

      // Small delay for toast to show
      setTimeout(onSaved, 500);
    } catch (err) {
      console.error("Failed to save reminder:", err);
      showToast("Failed to save reminder", "error");
      setSaving(false);
    }
  }

  async function handleRequestPermission() {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      showToast("Notifications enabled!", "success");
    } else if (perm === "denied") {
      showToast("Notifications blocked by browser", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <IconClock size={28} className="text-accent animate-pulse" />
      </div>
    );
  }

  const stepLabels = ["Game", "Category", "Title", "When", "Alert", "Review"];
  const notificationPermission = getNotificationPermission();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <IconArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-text-primary">
              {editId ? "Edit Reminder" : "New Reminder"}
            </h1>
            <p className="text-[11px] text-text-muted">
              {stepLabels[step - 1]} — Step {step} of {TOTAL_STEPS}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-[3px] flex-1 rounded-full transition-all duration-300",
                i < step ? "bg-gradient-to-r from-accent to-[#c084fc]" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 px-5 pt-3 pb-6">
        {/* STEP 1 — Select Game */}
        {step === 1 && (
          <div className="anim-slide-up">
            <h2 className="text-base font-bold text-text-primary mb-1">Which game?</h2>
            <p className="text-xs text-text-muted mb-4">Choose the game for this reminder</p>
            <div className="grid grid-cols-3 gap-2.5">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setStep(2);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                    selectedGameId === game.id
                      ? "border-accent bg-accent/8 shadow-[0_0_20px_-4px] shadow-accent/20"
                      : "card-base"
                  )}
                >
                  <GameIcon game={game} size="lg" />
                  <span className="text-[11px] font-semibold text-text-primary text-center leading-tight">
                    {game.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Category + Optional Subcategory */}
        {step === 2 && (
          <div className="anim-slide-up">
            <div className="flex items-center gap-2.5 mb-4">
              {selectedGame && <GameIcon game={selectedGame} size="sm" />}
              <div>
                <h2 className="text-base font-bold text-text-primary">Category</h2>
                <p className="text-[11px] text-text-muted">What type of reminder?</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setSelectedSubcategoryId("");
                    if (cat.subcategories.length === 0) setStep(3);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all",
                    selectedCategoryId === cat.id ? "border-accent bg-accent/8" : "card-base"
                  )}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[13px] font-semibold text-text-primary">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Subcategory section */}
            {selectedCategoryId && subcats.length > 0 && (
              <div className="mt-4 anim-fade">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Subcategory <span className="text-text-muted/60 normal-case tracking-normal font-normal">— optional</span>
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setSelectedSubcategoryId("");
                      setStep(3);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      !selectedSubcategoryId ? "border-accent/40 bg-accent/5" : "card-base"
                    )}
                  >
                    <span className="text-text-muted text-sm">—</span>
                    <span className="text-[13px] text-text-secondary">Skip</span>
                  </button>
                  {subcats.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubcategoryId(sub.id);
                        setStep(3);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                        selectedSubcategoryId === sub.id ? "border-accent bg-accent/8" : "card-base"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-[13px] font-medium text-text-primary">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              className="mt-4 text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
            >
              <IconArrowLeft size={12} /> Change game
            </button>
          </div>
        )}

        {/* STEP 3 — Title */}
        {step === 3 && (
          <div className="anim-slide-up">
            <MiniSummary game={selectedGame} category={selectedCategory} sub={selectedSub} />
            <h2 className="text-base font-bold text-text-primary mb-1 mt-4">What should we remind you?</h2>
            <p className="text-xs text-text-muted mb-4">Enter a clear, short title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Collect Daily Chest"
              className="input-field text-[15px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) setStep(4);
              }}
            />
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                <IconArrowLeft size={12} /> Back
              </button>
              <button
                onClick={() => title.trim() && setStep(4)}
                disabled={!title.trim()}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                  title.trim() ? "btn-accent" : "bg-border text-text-muted cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Date & Time */}
        {step === 4 && (
          <div className="anim-slide-up">
            <MiniSummary game={selectedGame} category={selectedCategory} sub={selectedSub} />
            <h2 className="text-base font-bold text-text-primary mb-1 mt-4">When?</h2>
            <p className="text-xs text-text-muted mb-4">Pick a date, time, and repeat schedule</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
                  Date
                </label>
                <div className="relative">
                  <IconCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field pl-9 text-[14px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
                  Time
                </label>
                <div className="relative">
                  <IconClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="input-field pl-9 text-[14px]"
                  />
                </div>
              </div>
            </div>

            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">
              Repeat
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([["none", "Once"], ["daily", "Daily"], ["weekly", "Weekly"], ["custom", "Custom"]] as const).map(
                ([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setRepeatRule(val)}
                    className={cn(
                      "py-2.5 rounded-xl text-[12px] font-semibold border transition-all",
                      repeatRule === val
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-bg-card text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep(3)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                <IconArrowLeft size={12} /> Back
              </button>
              <button onClick={() => setStep(5)} className="flex-1 btn-accent py-3 rounded-xl text-sm font-semibold">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Notification Type */}
        {step === 5 && (
          <div className="anim-slide-up">
            <MiniSummary game={selectedGame} category={selectedCategory} sub={selectedSub} />
            <h2 className="text-base font-bold text-text-primary mb-1 mt-4">How should we alert you?</h2>
            <p className="text-xs text-text-muted mb-4">Choose your notification style</p>

            {/* Permission warning */}
            {notificationPermission !== "granted" && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 mb-4 flex items-center gap-3">
                <IconBell size={18} className="text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-text-primary">Notifications not enabled</p>
                  <p className="text-[11px] text-text-muted">Enable to receive alerts</p>
                </div>
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-warning/20 text-warning"
                >
                  Enable
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNotificationType("push")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  notificationType === "push"
                    ? "border-accent bg-accent/8 shadow-[0_0_24px_-6px] shadow-accent/15"
                    : "card-base"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <IconBell size={20} className="text-accent" />
                </div>
                <p className="text-[13px] font-bold text-text-primary">Push</p>
                <p className="text-[11px] text-text-muted mt-0.5">Standard notification</p>
              </button>
              <button
                onClick={() => setNotificationType("alarm")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  notificationType === "alarm"
                    ? "border-warning bg-warning/8 shadow-[0_0_24px_-6px] shadow-warning/15"
                    : "card-base"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                  <IconAlarm size={20} className="text-warning" />
                </div>
                <p className="text-[13px] font-bold text-text-primary">Alarm</p>
                <p className="text-[11px] text-text-muted mt-0.5">Full-screen alert</p>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep(4)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                <IconArrowLeft size={12} /> Back
              </button>
              <button onClick={() => setStep(6)} className="flex-1 btn-accent py-3 rounded-xl text-sm font-semibold">
                Review
              </button>
            </div>
          </div>
        )}

        {/* STEP 6 — Review & Save */}
        {step === 6 && (
          <div className="anim-scale">
            <h2 className="text-base font-bold text-text-primary mb-4">Review & Save</h2>

            <div className="card-base rounded-2xl p-4 space-y-3.5">
              {/* Game */}
              <div className="flex items-center gap-3">
                <GameIcon game={selectedGame} size="lg" />
                <div>
                  <p className="text-[15px] font-bold text-text-primary">{title || "Untitled"}</p>
                  <p className="text-[12px] text-text-muted">{selectedGame?.name}</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <ReviewRow
                icon={<span className="text-base">{selectedCategory?.icon}</span>}
                label="Category"
                value={`${selectedCategory?.name || "—"}${selectedSub ? ` → ${selectedSub.name}` : ""}`}
              />
              <ReviewRow
                icon={<IconCalendar size={16} className="text-text-muted" />}
                label="Date"
                value={`${formatShortDate(`${date}T${time}`)} at ${formatShortTime(`${date}T${time}`)}`}
              />
              <ReviewRow
                icon={<IconRepeat size={16} className="text-text-muted" />}
                label="Repeat"
                value={repeatRule === "none" ? "One-time" : repeatRule.charAt(0).toUpperCase() + repeatRule.slice(1)}
              />
              <ReviewRow
                icon={
                  notificationType === "alarm" ? (
                    <IconAlarm size={16} className="text-warning" />
                  ) : (
                    <IconBell size={16} className="text-accent" />
                  )
                }
                label="Alert"
                value={notificationType === "alarm" ? "Alarm" : "Push Notification"}
              />
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep(5)}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                <IconArrowLeft size={12} /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-accent py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  "Saving…"
                ) : (
                  <>
                    <IconCheck size={16} /> {editId ? "Update Reminder" : "Save Reminder"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
}

function MiniSummary({
  game,
  category,
  sub,
}: {
  game?: Game | null;
  category?: Category | null;
  sub?: { name: string } | null;
}) {
  if (!game) return null;
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-card/60 border border-border-subtle">
      <GameIcon game={game} size="xs" />
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted truncate">
        <span className="font-semibold" style={{ color: game.color }}>
          {game.name}
        </span>
        {category && (
          <>
            <span className="text-border">·</span>
            <span>
              {category.icon} {category.name}
            </span>
          </>
        )}
        {sub && (
          <>
            <span className="text-border">·</span>
            <span>{sub.name}</span>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}
