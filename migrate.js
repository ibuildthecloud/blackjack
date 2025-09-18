import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create postgres client for migrations
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    await migrate(drizzle(client), {
      migrationsFolder: "./drizzle",
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});
