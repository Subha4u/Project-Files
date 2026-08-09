"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { AddReminderScreen } from "@/components/screens/AddReminderScreen";
import { ReminderDetailScreen } from "@/components/screens/ReminderDetailScreen";
import { RemindersListScreen } from "@/components/screens/RemindersListScreen";
import { GamesScreen } from "@/components/screens/GamesScreen";
import { CategoriesScreen } from "@/components/screens/CategoriesScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { BottomNav } from "@/components/BottomNav";
import { AlarmModal } from "@/components/AlarmModal";
import { Toast, useToast } from "@/components/Toast";
import {
  initReminderEngine,
  setAlarmCallback,
  rescheduleAllReminders,
  openGame,
  getNotificationPermission,
  type AlarmData,
} from "@/lib/reminder-engine";

type Screen =
  | { type: "home" }
  | { type: "add-reminder"; editId?: string }
  | { type: "reminder-detail"; id: string }
  | { type: "reminders" }
  | { type: "games" }
  | { type: "categories" }
  | { type: "settings" };

function isTabScreen(s: Screen): boolean {
  return s.type === "home" || s.type === "reminders" || s.type === "games" || s.type === "categories" || s.type === "settings";
}

export default function App() {
  const [screenStack, setScreenStack] = useState<Screen[]>([{ type: "home" }]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const suppressPopRef = useRef(false);

  // Alarm state
  const [alarmData, setAlarmData] = useState<AlarmData | null>(null);

  // Toast
  const { toast, show: showToast, hide: hideToast } = useToast();

  const screen = screenStack[screenStack.length - 1];

  // Initialize app
  useEffect(() => {
    async function init() {
      // Seed database
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch {}
      setSeeded(true);

      // Initialize reminder engine
      const ready = await initReminderEngine();
      setEngineReady(ready);

      if (ready) {
        // Set alarm callback for in-app alarms
        setAlarmCallback((alarm) => {
          setAlarmData(alarm);
        });

        // Reschedule all pending reminders on startup
        const scheduled = await rescheduleAllReminders();
        if (scheduled > 0) {
          console.log(`[App] Rescheduled ${scheduled} reminders on startup`);
        }
      }

      // Handle URL parameters (from notification clicks)
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      const reminderId = params.get("reminder");

      if (action === "snooze" && reminderId) {
        // Auto-snooze with default duration
        try {
          await fetch(`/api/reminders/${reminderId}/snooze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          showToast("Reminder snoozed", "success");
        } catch {}
        window.history.replaceState({}, "", "/");
      } else if (action === "dismiss" && reminderId) {
        // Auto-dismiss
        try {
          await fetch(`/api/reminders/${reminderId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dismissed: true }),
          });
          showToast("Reminder dismissed", "success");
        } catch {}
        window.history.replaceState({}, "", "/");
      } else if (action === "open_game") {
        const packageId = params.get("package");
        if (packageId) {
          const result = openGame(packageId);
          if (!result.success) {
            showToast(result.error || "Could not open game", "error");
          }
        }
        window.history.replaceState({}, "", "/");
      } else if (reminderId) {
        // Navigate to reminder detail
        setScreenStack([{ type: "home" }, { type: "reminder-detail", id: reminderId }]);
        window.history.replaceState({}, "", "/");
      }
    }

    init();
  }, []);

  // Listen for reminder events from service worker
  useEffect(() => {
    function handleReminderClicked(e: CustomEvent) {
      const { reminderId } = e.detail;
      if (reminderId) {
        setScreenStack([{ type: "home" }, { type: "reminder-detail", id: reminderId }]);
        setRefreshKey((k) => k + 1);
      }
    }

    function handleReminderSnooze(e: CustomEvent) {
      const { reminderId } = e.detail;
      if (reminderId) {
        // Show snooze picker - for now, auto-snooze with default
        fetch(`/api/reminders/${reminderId}/snooze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then(() => {
          showToast("Reminder snoozed", "success");
          setRefreshKey((k) => k + 1);
        });
      }
    }

    function handleReminderDismiss(e: CustomEvent) {
      const { reminderId } = e.detail;
      if (reminderId) {
        fetch(`/api/reminders/${reminderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissed: true }),
        }).then(() => {
          showToast("Reminder dismissed", "success");
          setRefreshKey((k) => k + 1);
        });
      }
    }

    function handleReminderTriggered(e: CustomEvent) {
      // Refresh to show updated state
      setRefreshKey((k) => k + 1);
    }

    window.addEventListener("reminder-clicked", handleReminderClicked as EventListener);
    window.addEventListener("reminder-snooze", handleReminderSnooze as EventListener);
    window.addEventListener("reminder-dismiss", handleReminderDismiss as EventListener);
    window.addEventListener("reminder-triggered", handleReminderTriggered as EventListener);

    return () => {
      window.removeEventListener("reminder-clicked", handleReminderClicked as EventListener);
      window.removeEventListener("reminder-snooze", handleReminderSnooze as EventListener);
      window.removeEventListener("reminder-dismiss", handleReminderDismiss as EventListener);
      window.removeEventListener("reminder-triggered", handleReminderTriggered as EventListener);
    };
  }, [showToast]);

  // Browser history sync
  useEffect(() => {
    function onPopState() {
      if (suppressPopRef.current) {
        suppressPopRef.current = false;
        return;
      }
      setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const push = useCallback((s: Screen) => {
    setScreenStack((prev) => [...prev, s]);
    window.history.pushState(null, "", "");
  }, []);

  const goBack = useCallback(() => {
    setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    suppressPopRef.current = true;
    window.history.back();
    refresh();
  }, [refresh]);

  const switchTab = useCallback((s: Screen) => {
    setScreenStack([s]);
    window.history.replaceState(null, "", "");
    refresh();
  }, [refresh]);

  // Alarm handlers
  const handleAlarmOpenGame = useCallback(() => {
    if (alarmData?.gamePackageId) {
      const result = openGame(alarmData.gamePackageId);
      if (!result.success) {
        showToast(result.error || "Could not open game", "error");
      }
    }
    setAlarmData(null);
  }, [alarmData, showToast]);

  const handleAlarmSnooze = useCallback(async (minutes: number) => {
    if (alarmData?.reminderId) {
      try {
        await fetch(`/api/reminders/${alarmData.reminderId}/snooze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: minutes }),
        });
        showToast(`Snoozed for ${minutes} minutes`, "success");
        refresh();
      } catch (err) {
        showToast("Failed to snooze", "error");
      }
    }
    setAlarmData(null);
  }, [alarmData, showToast, refresh]);

  const handleAlarmDismiss = useCallback(async () => {
    if (alarmData?.reminderId) {
      try {
        await fetch(`/api/reminders/${alarmData.reminderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissed: true }),
        });
        showToast("Reminder dismissed", "success");
        refresh();
      } catch (err) {
        showToast("Failed to dismiss", "error");
      }
    }
    setAlarmData(null);
  }, [alarmData, showToast, refresh]);

  // Determine active tab
  const rootScreen = screenStack.find(isTabScreen) || screenStack[0];
  const activeTab =
    rootScreen.type === "home" ? "home" :
    rootScreen.type === "reminders" ? "reminders" :
    rootScreen.type === "games" ? "games" :
    rootScreen.type === "categories" ? "categories" :
    rootScreen.type === "settings" ? "settings" : "home";

  if (!seeded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-[#c084fc] flex items-center justify-center shadow-lg shadow-accent/30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="17" cy="10" r="1"/><circle cx="15" cy="13" r="1"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-text-primary">GameReminder</h1>
            <p className="text-sm text-text-muted mt-1">Loading your reminders…</p>
          </div>
          <div className="w-40 h-1 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#c084fc]" style={{ animation: "shimmer 1.5s ease-in-out infinite", backgroundSize: "200% 100%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-bg-primary relative">
      <div className="flex-1 overflow-y-auto pb-[5.5rem]">
        {screen.type === "home" && (
          <HomeScreen
            key={refreshKey}
            onAddReminder={() => push({ type: "add-reminder" })}
            onViewReminder={(id: string) => push({ type: "reminder-detail", id })}
            onRefresh={refresh}
          />
        )}
        {screen.type === "add-reminder" && (
          <AddReminderScreen
            editId={screen.editId}
            onBack={goBack}
            onSaved={goBack}
          />
        )}
        {screen.type === "reminder-detail" && (
          <ReminderDetailScreen
            id={screen.id}
            onBack={goBack}
            onEdit={(id: string) => push({ type: "add-reminder", editId: id })}
          />
        )}
        {screen.type === "reminders" && (
          <RemindersListScreen
            key={refreshKey}
            onViewReminder={(id: string) => push({ type: "reminder-detail", id })}
            onAddReminder={() => push({ type: "add-reminder" })}
          />
        )}
        {screen.type === "games" && <GamesScreen />}
        {screen.type === "categories" && <CategoriesScreen />}
        {screen.type === "settings" && <SettingsScreen />}
      </div>

      <BottomNav activeTab={activeTab} onNavigate={(tab) => {
        if (tab === "home") switchTab({ type: "home" });
        else if (tab === "reminders") switchTab({ type: "reminders" });
        else if (tab === "games") switchTab({ type: "games" });
        else if (tab === "categories") switchTab({ type: "categories" });
        else if (tab === "settings") switchTab({ type: "settings" });
      }} />

      {/* Alarm Modal */}
      <AlarmModal
        isOpen={!!alarmData}
        reminderId={alarmData?.reminderId || ""}
        title={alarmData?.title || ""}
        gameName={alarmData?.gameName || ""}
        gameIcon={alarmData?.gameIcon}
        gamePackageId={alarmData?.gamePackageId}
        scheduledTime={alarmData?.scheduledTime || new Date()}
        onOpenGame={handleAlarmOpenGame}
        onSnooze={handleAlarmSnooze}
        onDismiss={handleAlarmDismiss}
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
