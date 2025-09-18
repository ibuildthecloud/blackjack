import { z } from "zod";
import { DefineTool } from "$framework";
import { gameUI } from "./ui";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-new-game",
  description: "Create a new blackjack game",
  inputSchema: {
    bet: z
      .number()
      .min(1)
      .default(10)
      .describe("The amount to bet for this hand"),
    sideBets: z
      .object({
        luckyLucky: z
          .number()
          .min(0)
          .default(0)
          .describe("Lucky Lucky side bet amount"),
        perfectPairs: z
          .number()
          .min(0)
          .default(0)
          .describe("Perfect Pairs side bet amount"),
      })
      .optional()
      .describe("Optional side bets"),
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
  execute: async ({ bet, sideBets, rules }, ctx) => {
    let money = 200;

    const id = Game.getGameIdFromSession(ctx);
    const existingGame = await Game.load(id);

    if (existingGame) {
      if (existingGame.state?.stage !== "done") {
        throw new Error("Must finish current game");
      }
      money = existingGame.getPublicState().money || 0;
    }

    const game = new Game(id, money);
    await game.deal(bet, sideBets, rules);

    return {
      text: game.toString(),
      ui: gameUI(id),
    };
  },
});
