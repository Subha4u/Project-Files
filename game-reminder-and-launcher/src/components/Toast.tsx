"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconX } from "./Icons";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const colors = {
    success: "bg-success/15 border-success/30 text-success",
    error: "bg-danger/15 border-danger/30 text-danger",
    info: "bg-accent/15 border-accent/30 text-accent",
  };

  const icons = {
    success: <IconCheck size={16} />,
    error: <IconX size={16} />,
    info: <span className="text-sm">ℹ️</span>,
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] max-w-sm w-full px-4 anim-slide-down">
      <div className={cn("rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-lg", colors[type])}>
        {icons[type]}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

// Hook for using toast
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const show = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, isVisible: true });
  };

  const hide = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return { toast, show, hide };
}
