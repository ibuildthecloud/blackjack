import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { gameState } from "../db/schema.js";
import { gzipSync, gunzipSync } from "zlib";
import type { State } from "engine-blackjack";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface GameStateData {
  state: State;
  money: number;
  metadata?: {
    createdAt: Date;
  };
}

export async function saveGameState(gameId: string, gameData: GameStateData) {
  const jsonString = JSON.stringify(gameData);
  const compressedData = gzipSync(jsonString);

  await db
    .insert(gameState)
    .values({
      id: gameId,
      compressedState: compressedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gameState.id,
      set: {
        compressedState: compressedData,
        updatedAt: new Date(),
      },
    });
}

export async function loadGameState(gameId: string) {
  const records = await db
    .select()
    .from(gameState)
    .where(eq(gameState.id, gameId))
    .limit(1);

  const record = records[0];
  if (!record) {
    return null;
  }

  try {
    const decompressedData = gunzipSync(record.compressedState);
    return JSON.parse(decompressedData.toString()) as GameStateData;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}
