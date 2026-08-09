"use client";

import { cn } from "@/lib/utils";
import { IconHome, IconBell, IconGamepad, IconGrid, IconSettings } from "./Icons";

type Tab = "home" | "reminders" | "games" | "categories" | "settings";

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "home",       label: "Home",       Icon: IconHome },
  { id: "reminders",  label: "Reminders",  Icon: IconBell },
  { id: "games",      label: "Games",      Icon: IconGamepad },
  { id: "categories", label: "Categories", Icon: IconGrid },
  { id: "settings",   label: "Settings",   Icon: IconSettings },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto glass-nav safe-bottom z-50">
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 relative min-w-[3.2rem]",
                active ? "text-accent" : "text-text-muted hover:text-text-secondary"
              )}
            >
              {active && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-accent" />
              )}
              <Icon size={20} className={cn(active && "drop-shadow-[0_0_6px_rgba(124,92,252,0.5)]")} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
