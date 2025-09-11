import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
type Card = import("engine-blackjack").Card;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-deal",
  description: "Deal initial cards to start a new hand in a blackjack game",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
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
  },
  execute: async ({ gameId, bet, sideBets }) => {
    const game = await getGame(gameId);
    if (!game) {
      return {
        text: `Game ${gameId} not found`,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Game not found", gameId }, null, 2),
          },
        ],
      };
    }

    try {
      // Dispatch the deal action
      const dealAction = actions.deal({
        bet,
        sideBets: sideBets || { luckyLucky: 0, perfectPairs: 0 },
      });
      const newState = game.dispatch(dealAction);

      // Save updated game state to database
      await updateGame(gameId, game);

      const result = {
        gameId,
        action: "deal",
        success: true,
        stage: newState.stage,
        playerCards: {
          right: newState.handInfo.right.cards,
          value: newState.handInfo.right.playerValue,
        },
        dealerUpCard: newState.dealerCards?.[0] || null,
        bet: newState.initialBet,
        availableActions: newState.handInfo.right.availableActions,
        hasBlackjack: newState.handInfo.right.playerHasBlackjack,
        dealerHasBlackjack: newState.dealerHasBlackjack,
        sideBetsResults: newState.sideBetsInfo,
      };

      let message = `Cards dealt! Player: ${result.playerCards.right.map((c: Card) => `${c.text}${c.suite[0].toUpperCase()}`).join(", ")}, Dealer up card: ${result.dealerUpCard ? `${result.dealerUpCard.text}${result.dealerUpCard.suite[0].toUpperCase()}` : "None"}`;

      if (result.hasBlackjack) {
        message += " - BLACKJACK!";
      }

      if (result.dealerHasBlackjack) {
        message += " - Dealer has blackjack!";
      }

      return {
        text: message,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
          gameUI(gameId),
        ],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        text: `Error dealing cards: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Deal failed",
                message: errorMessage,
                gameId,
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  },
});
