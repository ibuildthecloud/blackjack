import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-get-state",
  description: "Get the current state of a blackjack game",
  inputSchema: {},
  execute: async (_, ctx) => {
    const game = await Game.fromSession(ctx);
    return game.toString();
  },
});
