import { db } from "./index";
import { games, categories, subcategories, reminders, settings } from "./schema";
import { sql } from "drizzle-orm";

export async function seed() {
  // Check if already seeded
  const existingGames = await db.select().from(games);
  if (existingGames.length > 0) return;

  // Insert settings
  await db.insert(settings).values({
    id: 1,
    defaultNotificationType: "push",
    snoozeDuration: 15,
    theme: "dark",
  });

  // Insert games
  const insertedGames = await db
    .insert(games)
    .values([
      {
        name: "Clash Royale",
        packageId: "com.supercell.clashroyale",
        iconUrl: "/images/game-clash-royale.png",
        color: "#3B82F6",
      },
      {
        name: "Genshin Impact",
        packageId: "com.miHoYo.GenshinImpact",
        iconUrl: "/images/game-genshin.png",
        color: "#06B6D4",
      },
      {
        name: "Candy Crush",
        packageId: "com.king.candycrushsaga",
        iconUrl: "/images/game-candy.png",
        color: "#A855F7",
      },
      {
        name: "Call of Duty Mobile",
        packageId: "com.activision.callofduty.shooter",
        iconUrl: "/images/game-cod.png",
        color: "#22C55E",
      },
      {
        name: "Among Us",
        packageId: "com.innersloth.spacemafia",
        iconUrl: "/images/game-among.png",
        color: "#EF4444",
      },
      {
        name: "Adventure Quest",
        packageId: "com.adventure.explore",
        iconUrl: "/images/game-explore.png",
        color: "#F59E0B",
      },
    ])
    .returning();

  // Insert default categories
  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: "Daily", icon: "📅", isDefault: true },
      { name: "Reward", icon: "🎁", isDefault: true },
      { name: "Energy", icon: "⚡", isDefault: true },
      { name: "Event", icon: "🎪", isDefault: true },
      { name: "Tournament", icon: "🏆", isDefault: true },
      { name: "Other", icon: "📌", isDefault: true },
    ])
    .returning();

  // Insert some subcategories
  const dailyCat = insertedCategories.find((c) => c.name === "Daily")!;
  const rewardCat = insertedCategories.find((c) => c.name === "Reward")!;
  const energyCat = insertedCategories.find((c) => c.name === "Energy")!;
  const eventCat = insertedCategories.find((c) => c.name === "Event")!;
  const tournamentCat = insertedCategories.find((c) => c.name === "Tournament")!;

  await db.insert(subcategories).values([
    { categoryId: dailyCat.id, name: "Daily Login" },
    { categoryId: dailyCat.id, name: "Daily Quest" },
    { categoryId: dailyCat.id, name: "Daily Shop Reset" },
    { categoryId: rewardCat.id, name: "Free Chest" },
    { categoryId: rewardCat.id, name: "Ad Reward" },
    { categoryId: rewardCat.id, name: "Battle Pass" },
    { categoryId: energyCat.id, name: "Stamina Refill" },
    { categoryId: energyCat.id, name: "Lives Refill" },
    { categoryId: eventCat.id, name: "Limited Event" },
    { categoryId: eventCat.id, name: "Seasonal Event" },
    { categoryId: tournamentCat.id, name: "Weekly Tournament" },
    { categoryId: tournamentCat.id, name: "Clan War" },
  ]);

  // Create sample reminders with various times
  const now = new Date();
  const clashRoyale = insertedGames.find((g) => g.name === "Clash Royale")!;
  const genshin = insertedGames.find((g) => g.name === "Genshin Impact")!;
  const candy = insertedGames.find((g) => g.name === "Candy Crush")!;
  const cod = insertedGames.find((g) => g.name === "Call of Duty Mobile")!;
  const among = insertedGames.find((g) => g.name === "Among Us")!;

  // Overdue reminders (past)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  // Today's reminders (future today)
  const inOneHour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const inThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const inFiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  // Upcoming reminders (future days)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(reminders).values([
    // Overdue
    {
      gameId: clashRoyale.id,
      categoryId: dailyCat.id,
      title: "Collect Free Chest",
      scheduledDateTime: twoHoursAgo,
      repeatRule: "daily",
      notificationType: "push",
      enabled: true,
    },
    {
      gameId: genshin.id,
      categoryId: energyCat.id,
      title: "Resin Cap Reached",
      scheduledDateTime: thirtyMinAgo,
      repeatRule: "none",
      notificationType: "alarm",
      enabled: true,
    },
    {
      gameId: candy.id,
      categoryId: rewardCat.id,
      title: "Daily Spin Reward",
      scheduledDateTime: oneHourAgo,
      repeatRule: "daily",
      notificationType: "push",
      enabled: true,
    },
    // Today
    {
      gameId: cod.id,
      categoryId: tournamentCat.id,
      title: "Ranked Match Season End",
      scheduledDateTime: inOneHour,
      repeatRule: "none",
      notificationType: "alarm",
      enabled: true,
    },
    {
      gameId: clashRoyale.id,
      categoryId: eventCat.id,
      title: "Clan War Battle Day",
      scheduledDateTime: inThreeHours,
      repeatRule: "weekly",
      notificationType: "push",
      enabled: true,
    },
    {
      gameId: genshin.id,
      categoryId: dailyCat.id,
      title: "Daily Commissions",
      scheduledDateTime: inFiveHours,
      repeatRule: "daily",
      notificationType: "push",
      enabled: true,
    },
    // Upcoming
    {
      gameId: among.id,
      categoryId: eventCat.id,
      title: "Game Night with Friends",
      scheduledDateTime: tomorrow,
      repeatRule: "weekly",
      notificationType: "alarm",
      enabled: true,
    },
    {
      gameId: candy.id,
      categoryId: rewardCat.id,
      title: "Weekly Challenge Reset",
      scheduledDateTime: dayAfterTomorrow,
      repeatRule: "weekly",
      notificationType: "push",
      enabled: true,
    },
    {
      gameId: cod.id,
      categoryId: eventCat.id,
      title: "New Season Launch",
      scheduledDateTime: nextWeek,
      repeatRule: "none",
      notificationType: "alarm",
      enabled: true,
    },
  ]);
}
