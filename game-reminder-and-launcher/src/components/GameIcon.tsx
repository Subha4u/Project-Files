"use client";

import type { Game } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GameIconProps {
  game?: Game | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "w-7 h-7 text-xs rounded-[8px]",
  sm: "w-9 h-9 text-sm rounded-[10px]",
  md: "w-12 h-12 text-lg rounded-[13px]",
  lg: "w-[3.5rem] h-[3.5rem] text-xl rounded-[15px]",
  xl: "w-[4.5rem] h-[4.5rem] text-2xl rounded-[18px]",
};

export function GameIcon({ game, size = "md", className }: GameIconProps) {
  if (game?.iconUrl) {
    return (
      <img
        src={game.iconUrl}
        alt={game.name}
        className={cn(sizes[size], "object-cover flex-shrink-0 shadow-lg", className)}
        style={{ boxShadow: `0 4px 16px -2px ${game.color}30` }}
      />
    );
  }

  return (
    <div
      className={cn(sizes[size], "flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg", className)}
      style={{
        background: `linear-gradient(135deg, ${game?.color || "#7c5cfc"}, ${game?.color || "#7c5cfc"}88)`,
        boxShadow: `0 4px 16px -2px ${game?.color || "#7c5cfc"}40`,
      }}
    >
      {game?.name?.[0] || "?"}
    </div>
  );
}
