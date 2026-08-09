import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [game] = await db.select().from(games).where(eq(games.id, id));
  if (!game) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return Response.json(game);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, packageId, iconUrl, color } = body;

  const [updated] = await db
    .update(games)
    .set({
      ...(name !== undefined && { name }),
      ...(packageId !== undefined && { packageId }),
      ...(iconUrl !== undefined && { iconUrl }),
      ...(color !== undefined && { color }),
    })
    .where(eq(games.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(games).where(eq(games.id, id));
  return Response.json({ status: "ok" });
}

