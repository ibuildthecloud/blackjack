import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-split",
  description:
    "Split a pair into two separate hands (when dealt two cards of the same value)",
  inputSchema: {},
  execute: async (_, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.split();
    return {
      text: game.toString(),
    };
  },
});
