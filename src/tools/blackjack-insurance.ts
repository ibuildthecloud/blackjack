import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-insurance",
  description:
    "Take insurance when dealer shows an Ace (side bet against dealer blackjack)",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
    bet: z
      .number()
      .min(0)
      .describe("Insurance bet amount (typically up to half of original bet)"),
  },
  execute: async ({ gameId, bet }) => {
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

      if (!rightHand.cards || !rightHand.availableActions?.insurance) {
        return {
          text: `Insurance action not available`,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Insurance not allowed",
                  availableActions: rightHand.availableActions,
                  dealerUpCard: currentState.dealerCards?.[0],
                  gameId,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Dispatch the insurance action
      const insuranceAction = actions.insurance({ bet });
      const newState = game.dispatch(insuranceAction);
      await updateGame(gameId, game);

      const result = {
        gameId,
        action: "insurance",
        success: true,
        stage: newState.stage,
        insuranceBet: bet,
        dealerUpCard: newState.dealerCards?.[0],
        dealerHasBlackjack: newState.dealerHasBlackjack,
        insuranceResult: newState.sideBetsInfo.insurance,
        playerHand: {
          cards: newState.handInfo.right.cards,
          value: newState.handInfo.right.playerValue,
          availableActions: newState.handInfo.right.availableActions,
        },
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

      let message = `Insurance bet placed: $${bet}`;

      if (newState.dealerHasBlackjack) {
        const insuranceWin = result.insuranceResult?.win || 0;
        message += ` - Dealer has blackjack! Insurance pays $${insuranceWin}`;
      } else {
        message += " - Dealer does not have blackjack. Insurance lost.";
      }

      if (newState.stage === "STAGE_DONE") {
        message += " - Game Over!";
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
        text: `Error taking insurance: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Insurance failed",
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
