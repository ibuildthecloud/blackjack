import { DefineTool } from "$framework";
import { Game } from "$lib/game";

export default DefineTool({
  name: "blackjack-take-insurance",
  description:
    "Take insurance when dealer shows an Ace (side bet against dealer blackjack)",
  inputSchema: {},
  execute: async (_, ctx) => {
    const game = await Game.fromSession(ctx);
    await game.insurance(1);
    return game.toString();
  },
});
