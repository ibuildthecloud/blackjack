import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-decline-insurance",
  description: "Decline insurance when dealer shows an Ace",
  inputSchema: {},
  execute: async (_, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.insurance(0);
    return game.toString();
  },
});
