import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (cat?.isDefault) {
    return Response.json(
      { error: "Cannot delete default categories" },
      { status: 400 }
    );
  }
  await db.delete(categories).where(eq(categories.id, id));
  return Response.json({ status: "ok" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, icon } = body;

  const [updated] = await db
    .update(categories)
    .set({
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
    })
    .where(eq(categories.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }
  return Response.json(updated);
}
