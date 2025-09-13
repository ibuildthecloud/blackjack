import { z } from "zod";
import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-hit",
  description:
    "Request another card for the specified hand in a blackjack game",
  inputSchema: {
    position: z
      .enum(["right", "left"])
      .default("right")
      .describe(
        "Which hand to hit (right is main hand, left appears after split)",
      ),
  },
  execute: async ({ position }, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.hit(position);
    return game.toString();
  },
});
