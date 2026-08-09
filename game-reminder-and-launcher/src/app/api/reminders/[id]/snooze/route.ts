import { db } from "@/db";
import { reminders, settings, games, categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

/**
 * POST /api/reminders/[id]/snooze
 * Snooze a reminder for a specified duration
 * Body: { duration?: number } - minutes to snooze (defaults to settings.snoozeDuration)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get snooze duration from request body or settings
  let duration: number;
  try {
    const body = await request.json();
    duration = body.duration;
  } catch {
    duration = 0;
  }

  // If no duration specified, use default from settings
  if (!duration) {
    const [appSettings] = await db.select().from(settings).where(eq(settings.id, 1));
    duration = appSettings?.snoozeDuration || 15;
  }

  // Validate duration (must be between 1 and 120 minutes)
  if (duration < 1 || duration > 120) {
    return Response.json(
      { error: "Duration must be between 1 and 120 minutes" },
      { status: 400 }
    );
  }

  const snoozedUntil = new Date(Date.now() + duration * 60 * 1000);

  // Update the reminder
  const [updated] = await db
    .update(reminders)
    .set({
      snoozedUntil,
      // Clear triggered state so it can trigger again
      triggeredAt: null,
      updatedAt: new Date(),
    })
    .where(eq(reminders.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

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
    .where(eq(reminders.id, id));

  return Response.json({
    ...result.reminder,
    game: result.game,
    category: result.category,
    subcategory: result.subcategory,
    snoozedFor: duration,
  });
}
