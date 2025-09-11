import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-double",
  description:
    "Double down on a hand - double the bet and receive exactly one more card",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
    position: z
      .enum(["right", "left"])
      .default("right")
      .describe(
        "Which hand to double down on (right is main hand, left appears after split)",
      ),
  },
  execute: async ({ gameId, position }) => {
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
      const hand = currentState.handInfo[position];

      if (!hand.cards || !hand.availableActions?.double) {
        return {
          text: `Double action not available for ${position} hand`,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Double not allowed",
                  position,
                  availableActions: hand.availableActions,
                  gameId,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const originalBet = hand.bet;

      // Dispatch the double action
      const doubleAction = actions.double({ position });
      const newState = game.dispatch(doubleAction);

      // Save updated game state to database
      await updateGame(gameId, game);

      const updatedHand = newState.handInfo[position];
      const newCard = updatedHand.cards[updatedHand.cards.length - 1];

      const result = {
        gameId,
        action: "double",
        position,
        success: true,
        stage: newState.stage,
        originalBet,
        newBet: updatedHand.bet,
        newCard: newCard,
        hand: {
          cards: updatedHand.cards,
          value: updatedHand.playerValue,
          bet: updatedHand.bet,
          hasBusted: updatedHand.playerHasBusted,
        },
        dealerCards: newState.dealerCards,
        gameOver: newState.stage === "STAGE_DONE",
        finalResults:
          newState.stage === "STAGE_DONE"
            ? {
                finalBet: newState.finalBet,
                finalWin: newState.finalWin,
                wonOnRight: newState.wonOnRight,
                wonOnLeft: newState.wonOnLeft,
              }
            : null,
      };

      let message = `Doubled down on ${position} hand! Bet doubled to $${updatedHand.bet}. New card: ${newCard.text}${newCard.suite[0].toUpperCase()}`;

      if (updatedHand.playerHasBusted) {
        message += " - BUST!";
      }

      if (newState.stage === "STAGE_DONE") {
        message += " - Game Over!";
        if (result.finalResults && result.finalResults.finalWin > 0) {
          message += ` You won $${result.finalResults.finalWin}!`;
        }
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
        text: `Error doubling down: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Double failed",
                message: errorMessage,
                gameId,
                position,
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
