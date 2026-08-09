"use client";

import { useState, useEffect } from "react";
import type { AppSettings } from "@/lib/types";
import { IconSettings, IconBell, IconClock, IconAlarm, IconCheck } from "@/components/Icons";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => { setSettings(d); setLoading(false); });
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  async function updateSetting(key: string, value: string | number) {
    if (!settings) return;
    setSaving(true);
    setSettings({ ...settings, [key]: value });
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
    setSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
  }

  async function requestPermission() {
    if (typeof Notification !== "undefined") {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  }

  if (loading || !settings) return <div className="flex items-center justify-center py-24"><IconSettings size={28} className="text-accent animate-pulse" /></div>;

  return (
    <div className="px-5 pt-7 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary">Settings</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Configure GameReminder</p>
        </div>
        {(saving || showSaved) && (
          <span className={cn("text-[11px] font-semibold flex items-center gap-1 transition-all", showSaved ? "text-success" : "text-accent")}>
            {showSaved ? <><IconCheck size={12} /> Saved</> : "Saving…"}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Notifications */}
        <Section title="Notifications" icon={<IconBell size={16} className="text-accent" />}>
          <div className="flex items-center justify-between py-3 border-b border-white/[0.03]">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Browser Notifications</p>
              <p className="text-[11px] text-text-muted">
                {notifPermission === "granted" ? "Enabled" : notifPermission === "denied" ? "Blocked by browser" : "Not enabled"}
              </p>
            </div>
            {notifPermission === "granted" ? (
              <span className="w-7 h-7 rounded-lg bg-success/12 flex items-center justify-center"><IconCheck size={14} className="text-success" /></span>
            ) : notifPermission !== "denied" ? (
              <button onClick={requestPermission} className="text-[11px] font-semibold bg-accent/12 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors">Enable</button>
            ) : null}
          </div>
          <div className="py-3">
            <p className="text-[13px] font-semibold text-text-primary mb-2">Default Alert Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["push", "alarm"] as const).map((type) => (
                <button key={type} onClick={() => updateSetting("defaultNotificationType", type)}
                  className={cn("py-3 rounded-xl text-[12px] font-semibold border transition-all flex items-center justify-center gap-1.5",
                    settings.defaultNotificationType === type
                      ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated text-text-muted hover:text-text-secondary"
                  )}>
                  {type === "push" ? <><IconBell size={14} /> Push</> : <><IconAlarm size={14} /> Alarm</>}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Reminder Behavior */}
        <Section title="Behavior" icon={<IconClock size={16} className="text-accent" />}>
          <div className="py-3">
            <p className="text-[13px] font-semibold text-text-primary mb-2">Snooze Duration</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 15, 30].map((mins) => (
                <button key={mins} onClick={() => updateSetting("snoozeDuration", mins)}
                  className={cn("py-2.5 rounded-xl text-[12px] font-semibold border transition-all",
                    settings.snoozeDuration === mins
                      ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated text-text-muted"
                  )}>{mins}m</button>
              ))}
            </div>
          </div>
        </Section>

        {/* Theme */}
        <Section title="Appearance" icon={<span className="text-sm">🎨</span>}>
          <div className="grid grid-cols-2 gap-2 py-3">
            <button onClick={() => updateSetting("theme", "dark")}
              className={cn("py-3.5 rounded-xl text-[12px] font-semibold border transition-all flex items-center justify-center gap-2",
                settings.theme === "dark" ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated text-text-muted"
              )}>🌙 Dark</button>
            <button onClick={() => updateSetting("theme", "light")}
              className={cn("py-3.5 rounded-xl text-[12px] font-semibold border transition-all flex items-center justify-center gap-2",
                settings.theme === "light" ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-elevated text-text-muted"
              )}>☀️ Light</button>
          </div>
        </Section>

        {/* About */}
        <Section title="About" icon={<span className="text-sm">ℹ️</span>}>
          <div className="space-y-2 py-3">
            <AboutRow label="App" value="GameReminder" />
            <AboutRow label="Version" value="2.0.0" />
            <AboutRow label="Platform" value="Web (PWA)" />
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed pb-2">
            Set reminders for your favorite mobile games. Never miss an event, reward, or activity again.
          </p>
        </Section>

        {/* Test Notification */}
        <button onClick={() => {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("🎮 GameReminder Test", { body: "Notifications are working!", icon: "/favicon.svg" });
          } else { alert("Enable browser notifications first."); }
        }} className="w-full card-base py-3.5 rounded-2xl text-[13px] font-semibold text-text-secondary flex items-center justify-center gap-2 hover:text-text-primary">
          <IconBell size={15} /> Send Test Notification
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-base rounded-2xl p-4">
      <h2 className="text-[12px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-1">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[12px] font-semibold text-text-primary">{value}</span>
    </div>
  );
}
