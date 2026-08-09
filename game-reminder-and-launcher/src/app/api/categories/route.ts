import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allCategories = await db.select().from(categories).orderBy(categories.name);
  const allSubcategories = await db.select().from(subcategories);

  const categoriesWithSubs = allCategories.map((cat) => ({
    ...cat,
    subcategories: allSubcategories.filter((sub) => sub.categoryId === cat.id),
  }));

  return Response.json(categoriesWithSubs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, icon } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [newCategory] = await db
    .insert(categories)
    .values({
      name,
      icon: icon || "📁",
      isDefault: false,
    })
    .returning();

  return Response.json({ ...newCategory, subcategories: [] });
}
