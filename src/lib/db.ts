import { drizzle } from "drizzle-orm/node-postgres";
import { eq, count } from "drizzle-orm";
import { Pool } from "pg";
import { gameState } from "../db/schema.js";
import { gzipSync, gunzipSync } from "zlib";
import pkg from "engine-blackjack";
const { Game, presets } = pkg;
type GameType = InstanceType<typeof Game>;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface GameStateData {
  gameInstance: any;
  rules: any;
  metadata?: {
    createdAt: Date;
    lastAction?: string;
    actionCount?: number;
  };
}

export async function saveGameState(gameId: string, game: GameType): Promise<void> {
  const gameData: GameStateData = {
    gameInstance: game.getState(),
    rules: game.rules,
    metadata: {
      createdAt: new Date(),
      actionCount: 0,
    },
  };

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

export async function loadGameState(gameId: string): Promise<GameType | null> {
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
    const gameData: GameStateData = JSON.parse(decompressedData.toString());

    const game = new Game(gameData.gameInstance, gameData.rules);
    return game;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}

export async function deleteGameState(gameId: string): Promise<boolean> {
  try {
    await db.delete(gameState).where(eq(gameState.id, gameId));
    return true;
  } catch (error) {
    return false;
  }
}

export async function gameExists(gameId: string): Promise<boolean> {
  const result = await db
    .select({ count: count() })
    .from(gameState)
    .where(eq(gameState.id, gameId));
  
  return result[0]?.count > 0;
}

export { db };