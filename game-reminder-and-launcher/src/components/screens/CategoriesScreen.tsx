"use client";

import { useState, useEffect } from "react";
import type { Category } from "@/lib/types";
import { IconPlus, IconTrash, IconCheck, IconX, IconChevronDown, IconGrid } from "@/components/Icons";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["📁","📅","🎁","⚡","🎪","🏆","📌","⭐","🎯","🔥","💎","🎲","🗡️","🛡️","🧪","🎵","🌟","💰","🎖️","🏅"];

export function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSubAdd, setShowSubAdd] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📁");
  const [newSubName, setNewSubName] = useState("");

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName, icon: newCatIcon }) });
    setNewCatName(""); setNewCatIcon("📁"); setShowAdd(false); fetchCategories();
  }

  async function deleteCategory(id: string) {
    if (confirm("Delete this category?")) { await fetch(`/api/categories/${id}`, { method: "DELETE" }); fetchCategories(); }
  }

  async function addSubcategory(categoryId: string) {
    if (!newSubName.trim()) return;
    await fetch(`/api/categories/${categoryId}/subcategories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newSubName }) });
    setNewSubName(""); setShowSubAdd(null); fetchCategories();
  }

  async function deleteSubcategory(categoryId: string, subId: string) {
    await fetch(`/api/categories/${categoryId}/subcategories?subId=${subId}`, { method: "DELETE" });
    fetchCategories();
  }

  return (
    <div className="px-5 pt-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary">Categories</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Organize your reminders</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-accent w-9 h-9 rounded-xl flex items-center justify-center">
          {showAdd ? <IconX size={18} /> : <IconPlus size={18} />}
        </button>
      </div>

      {showAdd && (
        <div className="card-base rounded-2xl p-4 mb-4 anim-slide-down">
          <h3 className="text-[13px] font-bold text-text-primary mb-3">New Category</h3>
          <div className="space-y-3">
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" className="input-field text-[14px]" autoFocus />
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Icon</p>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => setNewCatIcon(emoji)}
                    className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all",
                      newCatIcon === emoji ? "bg-accent/20 ring-2 ring-accent" : "bg-bg-elevated hover:bg-bg-card-hover"
                    )}>{emoji}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs text-text-muted">Cancel</button>
              <button onClick={addCategory} disabled={!newCatName.trim()} className="flex-1 btn-accent py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                <IconCheck size={14} /> Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><IconGrid size={28} className="text-accent animate-pulse" /></div>
      ) : (
        <div className="space-y-2.5">
          {categories.map((cat, i) => (
            <div key={cat.id} className={cn("card-base rounded-2xl overflow-hidden anim-slide-up", `delay-${Math.min(i + 1, 5)}`)}>
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}>
                <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center text-xl flex-shrink-0">{cat.icon}</div>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-text-primary">{cat.name}</h3>
                  <p className="text-[11px] text-text-muted">{cat.subcategories.length} subcategories{cat.isDefault ? " · Default" : ""}</p>
                </div>
                {!cat.isDefault && (
                  <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-danger transition-colors">
                    <IconTrash size={13} />
                  </button>
                )}
                <IconChevronDown size={16} className={cn("text-text-muted transition-transform duration-200", expandedCat === cat.id && "rotate-180")} />
              </div>

              {expandedCat === cat.id && (
                <div className="border-t border-border px-4 py-3 bg-bg-secondary/30 anim-fade">
                  {cat.subcategories.length > 0 ? (
                    <div className="space-y-1 mb-3">
                      {cat.subcategories.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between pl-3 pr-1 py-2 rounded-lg hover:bg-bg-card/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                            <span className="text-[13px] text-text-primary">{sub.name}</span>
                          </div>
                          <button onClick={() => deleteSubcategory(cat.id, sub.id)} className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-danger transition-colors">
                            <IconX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted text-center py-2 mb-2">No subcategories</p>
                  )}

                  {showSubAdd === cat.id ? (
                    <div className="flex gap-2">
                      <input type="text" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Subcategory name" autoFocus
                        className="flex-1 input-field text-[13px] py-2.5" onKeyDown={(e) => { if (e.key === "Enter") addSubcategory(cat.id); }} />
                      <button onClick={() => addSubcategory(cat.id)} className="btn-accent px-3 py-2 rounded-lg text-[12px]">Add</button>
                      <button onClick={() => { setShowSubAdd(null); setNewSubName(""); }} className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-secondary">
                        <IconX size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSubAdd(cat.id)} className="w-full text-center text-[11px] font-semibold text-accent hover:text-accent-hover py-2 rounded-lg bg-accent/5 hover:bg-accent/10 transition-all flex items-center justify-center gap-1">
                      <IconPlus size={12} /> Add Subcategory
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
