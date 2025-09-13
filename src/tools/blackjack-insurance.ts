import { z } from "zod";
import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-insurance",
  description:
    "Take insurance when dealer shows an Ace (side bet against dealer blackjack)",
  inputSchema: {
    bet: z
      .number()
      .min(0)
      .describe("Insurance bet amount (typically up to half of original bet)"),
  },
  execute: async ({ bet }, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.insurance(bet);
    return game.toString();
  },
});
