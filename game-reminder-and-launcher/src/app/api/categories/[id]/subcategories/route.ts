import { db } from "@/db";
import { subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [newSub] = await db
    .insert(subcategories)
    .values({ categoryId, name })
    .returning();

  return Response.json(newSub);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: categoryId } = await params;
  const url = new URL(request.url);
  const subId = url.searchParams.get("subId");

  if (subId) {
    await db.delete(subcategories).where(eq(subcategories.id, subId));
  }

  return Response.json({ status: "ok" });
}
