import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const gameState = pgTable("GameState", {
  id: varchar("id").primaryKey(),
  compressedState: bytea("compressedState").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
