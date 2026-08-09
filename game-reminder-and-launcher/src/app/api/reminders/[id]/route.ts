import { db } from "@/db";
import { reminders, games, categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .where(eq(reminders.id, id));

  if (!result) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  const now = new Date();
  const reminder = result.reminder;
  const effectiveTime = reminder.snoozedUntil && reminder.snoozedUntil > now
    ? reminder.snoozedUntil
    : reminder.scheduledDateTime;

  return Response.json({
    ...reminder,
    game: result.game,
    category: result.category,
    subcategory: result.subcategory,
    isOverdue: effectiveTime <= now && !reminder.completed && !reminder.dismissed && reminder.enabled,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  // Track if scheduling-related fields changed (need to reschedule notification)
  let needsReschedule = false;

  if (body.gameId !== undefined) updateData.gameId = body.gameId;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.subcategoryId !== undefined) updateData.subcategoryId = body.subcategoryId || null;
  if (body.title !== undefined) updateData.title = body.title;
  
  if (body.scheduledDateTime !== undefined) {
    updateData.scheduledDateTime = new Date(body.scheduledDateTime);
    needsReschedule = true;
  }
  
  if (body.repeatRule !== undefined) {
    updateData.repeatRule = body.repeatRule;
    needsReschedule = true;
  }
  
  if (body.customRepeatDays !== undefined) {
    updateData.customRepeatDays = body.customRepeatDays || null;
  }
  
  if (body.notificationType !== undefined) {
    updateData.notificationType = body.notificationType;
    needsReschedule = true;
  }
  
  if (body.enabled !== undefined) {
    updateData.enabled = body.enabled;
    needsReschedule = true;
  }
  
  if (body.completed !== undefined) {
    updateData.completed = body.completed;
    if (body.completed) {
      // Clear triggered state when completing
      updateData.triggeredAt = null;
    }
  }
  
  if (body.dismissed !== undefined) {
    updateData.dismissed = body.dismissed;
    if (body.dismissed) {
      // Clear triggered state when dismissing
      updateData.triggeredAt = null;
    }
  }
  
  if (body.snoozedUntil !== undefined) {
    updateData.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null;
    needsReschedule = true;
  }

  if (body.lastNotificationId !== undefined) {
    updateData.lastNotificationId = body.lastNotificationId;
  }

  if (body.triggeredAt !== undefined) {
    updateData.triggeredAt = body.triggeredAt ? new Date(body.triggeredAt) : null;
  }

  const [updated] = await db
    .update(reminders)
    .set(updateData)
    .where(eq(reminders.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  // Fetch full data with relations
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
    .where(eq(reminders.id, id));

  return Response.json({
    ...result.reminder,
    game: result.game,
    category: result.category,
    subcategory: result.subcategory,
    needsReschedule,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get the reminder to return info about what was deleted
  const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));

  if (!reminder) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  // Delete the reminder (notification will be cancelled by client)
  await db.delete(reminders).where(eq(reminders.id, id));

  return Response.json({
    status: "ok",
    deletedId: id,
    lastNotificationId: reminder.lastNotificationId,
  });
}
