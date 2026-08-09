import { db } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allGames = await db.select().from(games).orderBy(games.name);
  return Response.json(allGames);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, packageId, iconUrl, color } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [newGame] = await db
    .insert(games)
    .values({
      name,
      packageId: packageId || "",
      iconUrl: iconUrl || "",
      color: color || "#6366f1",
    })
    .returning();

  return Response.json(newGame);
}
