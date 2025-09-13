import { z } from "zod";
import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-double",
  description:
    "Double down on a hand - double the bet and receive exactly one more card",
  inputSchema: {
    position: z
      .enum(["right", "left"])
      .default("right")
      .describe(
        "Which hand to double down on (right is main hand, left appears after split)",
      ),
  },
  execute: async ({ position }, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.double(position);
    return game.toString();
  },
});
