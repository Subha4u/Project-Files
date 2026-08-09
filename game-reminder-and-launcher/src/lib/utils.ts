import { formatDistanceToNow, format, isToday, isTomorrow, differenceInMinutes } from "date-fns";

export function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const diffMin = differenceInMinutes(new Date(), d);
  
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatReminderTime(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) {
    return `Today at ${format(d, "h:mm a")}`;
  }
  if (isTomorrow(d)) {
    return `Tomorrow at ${format(d, "h:mm a")}`;
  }
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatShortTime(date: string | Date): string {
  return format(new Date(date), "h:mm a");
}

export function formatShortDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

export function getRepeatLabel(rule: string): string {
  switch (rule) {
    case "none": return "One-time";
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "custom": return "Custom";
    default: return rule;
  }
}

export function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case "push": return "Push Notification";
    case "alarm": return "Alarm";
    default: return type;
  }
}

export function tryLaunchGame(packageId: string): boolean {
  if (!packageId) return false;
  
  // Try Android intent URL
  const androidUrl = `intent://#Intent;package=${packageId};end`;
  // Try iOS URL scheme (generic)
  const iosUrl = `${packageId}://`;
  
  // Detect platform
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  
  try {
    if (isAndroid) {
      window.location.href = androidUrl;
      return true;
    }
    if (isIOS) {
      window.location.href = iosUrl;
      return true;
    }
    // Fallback: try Google Play Store
    window.open(
      `https://play.google.com/store/apps/details?id=${packageId}`,
      "_blank"
    );
    return true;
  } catch {
    return false;
  }
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
