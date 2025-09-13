import { z } from "zod";
import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-stand",
  description: "Stand with the current hand total in a blackjack game",
  inputSchema: {
    position: z
      .enum(["right", "left"])
      .default("right")
      .describe(
        "Which hand to stand with (right is main hand, left appears after split)",
      ),
  },
  execute: async ({ position }, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.stand(position);
    return game.toString();
  },
});
