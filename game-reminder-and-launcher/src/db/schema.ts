import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  packageId: text("package_id").notNull().default(""),
  iconUrl: text("icon_url").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📁"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subcategories = pgTable("subcategories", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  subcategoryId: uuid("subcategory_id").references(() => subcategories.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  scheduledDateTime: timestamp("scheduled_date_time").notNull(),
  repeatRule: text("repeat_rule").notNull().default("none"),
  // customRepeatDays: e.g. "1,3,5" for Mon/Wed/Fri
  customRepeatDays: text("custom_repeat_days"),
  notificationType: text("notification_type").notNull().default("push"),
  enabled: boolean("enabled").notNull().default(true),
  completed: boolean("completed").notNull().default(false),
  dismissed: boolean("dismissed").notNull().default(false),
  // When the notification was actually triggered/sent
  triggeredAt: timestamp("triggered_at"),
  // Track notification scheduling to prevent duplicates
  lastNotificationId: text("last_notification_id"),
  snoozedUntil: timestamp("snoozed_until"),
  // For recurring: track how many times it has triggered
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  defaultNotificationType: text("default_notification_type")
    .notNull()
    .default("push"),
  snoozeDuration: integer("snooze_duration").notNull().default(15),
  theme: text("theme").notNull().default("dark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Track scheduled notifications for cleanup on restart
export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  reminderId: uuid("reminder_id")
    .notNull()
    .references(() => reminders.id, { onDelete: "cascade" }),
  notificationId: text("notification_id").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default("pending"), // pending, triggered, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
