import { db } from "@/db";
import { reminders, games, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";
import { addDays, addWeeks, setHours, setMinutes, getDay, isBefore } from "date-fns";

/**
 * POST /api/reminders/[id]/trigger
 * Marks a reminder as triggered and handles recurring logic
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get the reminder
  const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
  if (!reminder) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {
    triggeredAt: now,
    triggerCount: (reminder.triggerCount || 0) + 1,
    updatedAt: now,
  };

  // Handle recurring reminders
  if (reminder.repeatRule !== "none") {
    const nextOccurrence = calculateNextOccurrence(
      new Date(reminder.scheduledDateTime),
      reminder.repeatRule,
      reminder.customRepeatDays
    );

    if (nextOccurrence) {
      updates.scheduledDateTime = nextOccurrence;
      updates.triggeredAt = null; // Reset for next trigger
      updates.completed = false;
      updates.dismissed = false;
      updates.snoozedUntil = null;
    }
  }

  const [updated] = await db
    .update(reminders)
    .set(updates)
    .where(eq(reminders.id, id))
    .returning();

  return Response.json({
    ...updated,
    isRecurring: reminder.repeatRule !== "none",
    nextOccurrence: updates.scheduledDateTime || null,
  });
}

function calculateNextOccurrence(
  currentDateTime: Date,
  repeatRule: string,
  customRepeatDays?: string | null
): Date | null {
  const now = new Date();
  let nextDate: Date;

  switch (repeatRule) {
    case "none":
      return null;

    case "daily":
      nextDate = addDays(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;

    case "weekly":
      nextDate = addWeeks(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addWeeks(nextDate, 1);
      }
      return nextDate;

    case "custom":
      if (!customRepeatDays) return null;

      const days = customRepeatDays
        .split(",")
        .map(Number)
        .filter((d) => d >= 0 && d <= 6);
      if (days.length === 0) return null;

      const currentHour = currentDateTime.getHours();
      const currentMinute = currentDateTime.getMinutes();
      const today = getDay(now);

      // Find the next occurrence
      for (let i = 1; i <= 7; i++) {
        const targetDay = (today + i) % 7;
        if (days.includes(targetDay)) {
          let candidate = now;
          // Move to the target day
          const daysUntilTarget = (targetDay - getDay(candidate) + 7) % 7 || 7;
          candidate = addDays(candidate, daysUntilTarget);
          candidate = setHours(candidate, currentHour);
          candidate = setMinutes(candidate, currentMinute);

          if (isBefore(now, candidate)) {
            return candidate;
          }
        }
      }

      // Fallback: next week
      nextDate = addWeeks(currentDateTime, 1);
      while (isBefore(nextDate, now)) {
        nextDate = addWeeks(nextDate, 1);
      }
      return nextDate;

    default:
      return null;
  }
}
