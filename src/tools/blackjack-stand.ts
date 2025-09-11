import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-stand",
  description: "Stand with the current hand total in a blackjack game",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
    position: z
      .enum(["right", "left"])
      .default("right")
      .describe(
        "Which hand to stand with (right is main hand, left appears after split)",
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

      if (!hand.cards || !hand.availableActions?.stand) {
        return {
          text: `Stand action not available for ${position} hand`,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Stand not allowed",
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

      // Dispatch the stand action
      const standAction = actions.stand({ position });
      const newState = game.dispatch(standAction);

      // Save updated game state to database
      await updateGame(gameId, game);

      const result = {
        gameId,
        action: "stand",
        position,
        success: true,
        stage: newState.stage,
        hand: {
          cards: newState.handInfo[position].cards,
          value: newState.handInfo[position].playerValue,
          bet: newState.handInfo[position].bet,
        },
        dealerCards: newState.dealerCards,
        dealerValue:
          newState.dealerCards && newState.dealerCards.length > 0
            ? undefined
            : null,
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

      let message = `Stood with ${position} hand (${hand.playerValue.hi} points)`;

      if (newState.stage === "STAGE_DONE") {
        message += " - Game Over! ";
        if (result.finalResults && result.finalResults.finalWin > 0) {
          message += `You won $${result.finalResults.finalWin}!`;
        } else {
          message += "House wins.";
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
        text: `Error standing: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Stand failed",
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
