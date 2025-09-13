import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-surrender",
  description: "Surrender the current hand and forfeit half of the bet",
  inputSchema: {},
  execute: async (_, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.surrender();
    return game.toString();
  },
});
