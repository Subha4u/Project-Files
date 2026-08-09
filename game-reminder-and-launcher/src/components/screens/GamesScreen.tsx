"use client";

import { useState, useEffect } from "react";
import type { Game } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconX, IconArrowLeft, IconGamepad } from "@/components/Icons";
import { cn } from "@/lib/utils";

const COLORS = ["#7c5cfc", "#3B82F6", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#EC4899", "#14B8A6", "#F97316"];

export function GamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [packageId, setPackageId] = useState("");
  const [color, setColor] = useState("#7c5cfc");

  useEffect(() => { fetchGames(); }, []);

  async function fetchGames() {
    const res = await fetch("/api/games");
    setGames(await res.json());
    setLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const body = JSON.stringify({ name, packageId, color });
    if (editingId) await fetch(`/api/games/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
    else await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    reset(); fetchGames();
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this game and all its reminders?")) {
      await fetch(`/api/games/${id}`, { method: "DELETE" });
      fetchGames();
    }
  }

  function startEdit(g: Game) {
    setEditingId(g.id); setName(g.name); setPackageId(g.packageId); setColor(g.color); setShowAdd(true);
  }

  function reset() {
    setShowAdd(false); setEditingId(null); setName(""); setPackageId(""); setColor("#7c5cfc");
  }

  return (
    <div className="px-5 pt-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary">Games</h1>
          <p className="text-[12px] text-text-muted mt-0.5">{games.length} game{games.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button onClick={() => { reset(); setShowAdd(!showAdd); }}
          className="btn-accent w-9 h-9 rounded-xl flex items-center justify-center">
          {showAdd ? <IconX size={18} /> : <IconPlus size={18} />}
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card-base rounded-2xl p-4 mb-4 anim-slide-down">
          <h3 className="text-[13px] font-bold text-text-primary mb-3">{editingId ? "Edit Game" : "Add Game"}</h3>
          <div className="space-y-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Game Name" className="input-field text-[14px]" autoFocus />
            <input type="text" value={packageId} onChange={(e) => setPackageId(e.target.value)} placeholder="Package ID (e.g. com.example.game)" className="input-field text-[14px]" />
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={cn("w-8 h-8 rounded-lg transition-all", color === c ? "ring-2 ring-white/80 ring-offset-2 ring-offset-bg-card scale-110" : "hover:scale-105")}
                    style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="px-4 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} className="flex-1 btn-accent py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                <IconCheck size={14} /> {editingId ? "Update" : "Add Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><IconGamepad size={28} className="text-accent animate-pulse" /></div>
      ) : (
        <div className="space-y-2.5">
          {games.map((game, i) => (
            <div key={game.id} className={cn("card-base rounded-2xl p-4 flex items-center gap-4 anim-slide-up", `delay-${Math.min(i + 1, 5)}`)}>
              <GameIcon game={game} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-text-primary">{game.name}</h3>
                <p className="text-[11px] text-text-muted truncate mt-0.5">{game.packageId || "No package ID"}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: game.color }} />
                  <span className="text-[10px] text-text-muted font-mono">{game.color}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(game)} className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-accent transition-colors"><IconEdit size={14} /></button>
                <button onClick={() => handleDelete(game.id)} className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-danger transition-colors"><IconTrash size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
