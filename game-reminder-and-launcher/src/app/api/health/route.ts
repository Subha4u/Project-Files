import { db } from "@/db";
import { sql } from "drizzle-orm";
import { seed } from "@/db/seed";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    // Auto-seed on first health check
    try {
      await seed();
    } catch {
      // Seed may fail if tables don't exist yet, that's ok
    }
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 500 });
  }
}
