import { z } from "zod";
import { DefineTool } from "$framework";
import pkg from "engine-blackjack";
const { actions } = pkg;
type Card = import("engine-blackjack").Card;
import { getGame, updateGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-split",
  description:
    "Split a pair into two separate hands (when dealt two cards of the same value)",
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

      if (!rightHand.cards || !rightHand.availableActions?.split) {
        return {
          text: `Split action not available`,
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Split not allowed",
                  availableActions: rightHand.availableActions,
                  cards: rightHand.cards,
                  gameId,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Dispatch the split action
      const splitAction = actions.split();
      const newState = game.dispatch(splitAction);
      await updateGame(gameId, game);

      const result = {
        gameId,
        action: "split",
        success: true,
        stage: newState.stage,
        hands: {
          right: {
            cards: newState.handInfo.right.cards,
            value: newState.handInfo.right.playerValue,
            bet: newState.handInfo.right.bet,
            availableActions: newState.handInfo.right.availableActions,
          },
          left: {
            cards: newState.handInfo.left.cards,
            value: newState.handInfo.left.playerValue,
            bet: newState.handInfo.left.bet,
            availableActions: newState.handInfo.left.availableActions,
          },
        },
        dealerCards: newState.dealerCards,
        activeHand:
          newState.stage === "STAGE_PLAYER_TURN_RIGHT" ? "right" : "left",
        gameOver: newState.stage === "STAGE_DONE",
      };

      const rightCards = result.hands.right.cards.map(
        (c: Card) => `${c.text}${c.suite[0].toUpperCase()}`,
      );
      const leftCards = result.hands.left.cards.map(
        (c: Card) => `${c.text}${c.suite[0].toUpperCase()}`,
      );

      let message = `Split successful! Right hand: ${rightCards.join(", ")}, Left hand: ${leftCards.join(", ")}`;

      if (result.activeHand === "right") {
        message += " - Playing right hand first.";
      } else if (result.activeHand === "left") {
        message += " - Playing left hand first.";
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
        text: `Error splitting: ${errorMessage}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Split failed",
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
