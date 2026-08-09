import { seed } from "@/db/seed";

export async function POST() {
  try {
    await seed();
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
