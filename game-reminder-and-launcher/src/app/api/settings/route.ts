import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const [appSettings] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!appSettings) {
    return Response.json({
      id: 1,
      defaultNotificationType: "push",
      snoozeDuration: 15,
      theme: "dark",
    });
  }
  return Response.json(appSettings);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.defaultNotificationType !== undefined)
    updateData.defaultNotificationType = body.defaultNotificationType;
  if (body.snoozeDuration !== undefined)
    updateData.snoozeDuration = body.snoozeDuration;
  if (body.theme !== undefined) updateData.theme = body.theme;

  const [existing] = await db.select().from(settings).where(eq(settings.id, 1));
  
  if (existing) {
    const [updated] = await db
      .update(settings)
      .set(updateData)
      .where(eq(settings.id, 1))
      .returning();
    return Response.json(updated);
  } else {
    const [created] = await db
      .insert(settings)
      .values({
        id: 1,
        defaultNotificationType:
          (body.defaultNotificationType as string) || "push",
        snoozeDuration: (body.snoozeDuration as number) || 15,
        theme: (body.theme as string) || "dark",
      })
      .returning();
    return Response.json(created);
  }
}
