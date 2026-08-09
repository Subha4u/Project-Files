import { db } from "@/db";
import { reminders, games, categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter"); // overdue, today, upcoming, pending, all

  const allReminders = await db
    .select({
      reminder: reminders,
      game: games,
      category: categories,
      subcategory: subcategories,
    })
    .from(reminders)
    .leftJoin(games, eq(reminders.gameId, games.id))
    .leftJoin(categories, eq(reminders.categoryId, categories.id))
    .leftJoin(subcategories, eq(reminders.subcategoryId, subcategories.id))
    .orderBy(reminders.scheduledDateTime);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const enriched = allReminders.map((r) => {
    const snoozedUntil = r.reminder.snoozedUntil;
    const effectiveTime =
      snoozedUntil && snoozedUntil > now
        ? snoozedUntil
        : r.reminder.scheduledDateTime;
    
    const isOverdue =
      effectiveTime <= now &&
      !r.reminder.completed &&
      !r.reminder.dismissed &&
      r.reminder.enabled;
    
    const isToday =
      !isOverdue &&
      r.reminder.scheduledDateTime >= todayStart &&
      r.reminder.scheduledDateTime <= todayEnd &&
      !r.reminder.completed &&
      !r.reminder.dismissed;
    
    const isUpcoming =
      !isOverdue &&
      !isToday &&
      r.reminder.scheduledDateTime > todayEnd &&
      !r.reminder.completed &&
      !r.reminder.dismissed;

    // Pending = not yet due, not completed/dismissed, enabled
    const isPending =
      r.reminder.scheduledDateTime > now &&
      !r.reminder.completed &&
      !r.reminder.dismissed &&
      r.reminder.enabled;

    return {
      ...r.reminder,
      game: r.game,
      category: r.category,
      subcategory: r.subcategory,
      isOverdue,
      isToday,
      isUpcoming,
      isPending,
    };
  });

  if (filter === "overdue") {
    return Response.json(enriched.filter((r) => r.isOverdue));
  }
  if (filter === "today") {
    return Response.json(enriched.filter((r) => r.isToday));
  }
  if (filter === "upcoming") {
    return Response.json(enriched.filter((r) => r.isUpcoming));
  }
  if (filter === "pending") {
    return Response.json(enriched.filter((r) => r.isPending));
  }

  return Response.json(enriched);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    gameId,
    categoryId,
    subcategoryId,
    title,
    scheduledDateTime,
    repeatRule,
    customRepeatDays,
    notificationType,
  } = body;

  if (!gameId || !categoryId || !title || !scheduledDateTime) {
    return Response.json(
      { error: "gameId, categoryId, title, and scheduledDateTime are required" },
      { status: 400 }
    );
  }

  // Insert the reminder
  const [newReminder] = await db
    .insert(reminders)
    .values({
      gameId,
      categoryId,
      subcategoryId: subcategoryId || null,
      title,
      scheduledDateTime: new Date(scheduledDateTime),
      repeatRule: repeatRule || "none",
      customRepeatDays: customRepeatDays || null,
      notificationType: notificationType || "push",
      enabled: true,
      completed: false,
      dismissed: false,
      triggerCount: 0,
    })
    .returning();

  // Fetch the full reminder with relations
  const [result] = await db
    .select({
      reminder: reminders,
      game: games,
      category: categories,
      subcategory: subcategories,
    })
    .from(reminders)
    .leftJoin(games, eq(reminders.gameId, games.id))
    .leftJoin(categories, eq(reminders.categoryId, categories.id))
    .leftJoin(subcategories, eq(reminders.subcategoryId, subcategories.id))
    .where(eq(reminders.id, newReminder.id));

  return Response.json({
    ...result.reminder,
    game: result.game,
    category: result.category,
    subcategory: result.subcategory,
  });
}
