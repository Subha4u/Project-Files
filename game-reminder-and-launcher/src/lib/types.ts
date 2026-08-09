export interface Game {
  id: string;
  name: string;
  packageId: string;
  iconUrl: string;
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  gameId: string;
  categoryId: string;
  subcategoryId: string | null;
  title: string;
  scheduledDateTime: string;
  repeatRule: string;
  customRepeatDays?: string | null;
  notificationType: string;
  enabled: boolean;
  completed: boolean;
  dismissed: boolean;
  triggeredAt?: string | null;
  lastNotificationId?: string | null;
  triggerCount?: number;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  game?: Game | null;
  category?: Category | null;
  subcategory?: Subcategory | null;
  isOverdue?: boolean;
  isToday?: boolean;
  isUpcoming?: boolean;
  isPending?: boolean;
}

export interface AppSettings {
  id: number;
  defaultNotificationType: string;
  snoozeDuration: number;
  theme: string;
}

export type RepeatRule = "none" | "daily" | "weekly" | "custom";
export type NotificationType = "push" | "alarm";
