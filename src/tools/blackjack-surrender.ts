import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
type Card = import("engine-blackjack").Card;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-surrender",
  description: "Surrender the current hand and forfeit half of the bet",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
  },
  execute: async ({ gameId }) => {
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
      const currentState = game.getState();
      const rightHand = currentState.handInfo.right;

      if (!rightHand.cards || !rightHand.availableActions?.surrender) {
        return {
          text: `Surrender action not available`,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Surrender not allowed",
                  availableActions: rightHand.availableActions,
                  gameId,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const originalBet = rightHand.bet;

      // Dispatch the surrender action
      const surrenderAction = actions.surrender();
      const newState = game.dispatch(surrenderAction);
      await updateGame(gameId, game);

      const result = {
        gameId,
        action: "surrender",
        success: true,
        stage: newState.stage,
        originalBet,
        lostAmount: originalBet / 2,
        returnedAmount: originalBet / 2,
        hand: {
          cards: newState.handInfo.right.cards,
          value: newState.handInfo.right.playerValue,
          surrendered: newState.handInfo.right.playerHasSurrendered,
        },
        dealerCards: newState.dealerCards,
        gameOver: newState.stage === "STAGE_DONE",
        finalResults: {
          finalBet: newState.finalBet,
          finalWin: newState.finalWin,
          wonOnRight: newState.wonOnRight,
          wonOnLeft: newState.wonOnLeft,
        },
      };

      const cards = result.hand.cards.map(
        (c: Card) => `${c.text}${c.suite[0].toUpperCase()}`,
      );
      const message = `Surrendered hand: ${cards.join(", ")}. Lost $${result.lostAmount}, returned $${result.returnedAmount}`;

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
        text: `Error surrendering: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Surrender failed",
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
