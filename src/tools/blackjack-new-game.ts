import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { Game, presets } = pkg;
type GameType = InstanceType<typeof Game>;
import { saveGameState } from "$lib/db";
import { gameUI } from "./resource";

// Keep a small in-memory cache for frequently accessed games
const gameCache = new Map<string, GameType>();

export default DefineTool({
  name: "blackjack-new-game",
  description: "Create a new blackjack game with customizable rules",
  inputSchema: {
    gameId: z
      .string()
      .describe("Unique identifier for the game session")
      .optional(),
    rules: z
      .object({
        decks: z
          .number()
          .min(1)
          .max(8)
          .default(1)
          .describe("Number of decks to use"),
        standOnSoft17: z
          .boolean()
          .default(true)
          .describe("Dealer stands on soft 17"),
        double: z
          .enum(["any", "9or10", "9or10or11", "9thru15", "none"])
          .default("any")
          .describe("Double down rules"),
        split: z.boolean().default(true).describe("Allow splitting pairs"),
        doubleAfterSplit: z
          .boolean()
          .default(true)
          .describe("Allow doubling after split"),
        surrender: z.boolean().default(true).describe("Allow surrender"),
        insurance: z.boolean().default(true).describe("Allow insurance"),
        showdownAfterAceSplit: z
          .boolean()
          .default(true)
          .describe("Showdown after ace split"),
      })
      .optional()
      .describe("Game rules configuration"),
  },
  execute: async ({ gameId, rules }) => {
    // Generate gameId if not provided
    const id =
      gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create game rules
    const gameRules = rules ? presets.getRules(rules) : presets.getRules({});

    // Create new game instance
    const game = new Game(undefined, gameRules);

    // Save to database and cache
    await saveGameState(id, game);
    gameCache.set(id, game);

    // Get initial state
    const state = game.getState();

    return {
      text: `New blackjack game created with ID: ${id}`,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              gameId: id,
              stage: state.stage,
              rules: state.rules,
              message:
                "Game ready to start. Use blackjack-deal to begin playing.",
            },
            null,
            2,
          ),
        },
        gameUI(id),
      ],
    };
  },
});

// Export the games cache and utility functions for other tools
export { gameCache };

export async function getGame(gameId: string): Promise<GameType | null> {
  // Check cache first
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }

  // Load from database
  const { loadGameState } = await import("$lib/db");
  const game = await loadGameState(gameId);
  
  if (game) {
    gameCache.set(gameId, game);
  }
  
  return game;
}

export async function updateGame(gameId: string, game: GameType): Promise<void> {
  const { saveGameState } = await import("$lib/db");
  await saveGameState(gameId, game);
  gameCache.set(gameId, game);
}
