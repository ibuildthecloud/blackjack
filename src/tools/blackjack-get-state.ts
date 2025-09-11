import { z } from "zod";
import { DefineTool } from "$framework";
import { getGame } from "./blackjack-new-game";
import { gameUI } from "./resource";

export default DefineTool({
  name: "blackjack-get-state",
  description: "Get the current state of a blackjack game",
  inputSchema: {
    gameId: z.string().describe("The unique identifier of the game"),
    format: z
      .enum(["full", "summary", "player"])
      .default("summary")
      .describe("Level of detail in the response"),
  },
  execute: async ({ gameId, format }) => {
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

    const state = game.getState();
    delete state.deck;

    if (format === "full") {
      return {
        text: `Full game state for ${gameId}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(state, null, 2),
          },
          gameUI(gameId),
        ],
      };
    }

    if (format === "player") {
      const playerView = {
        gameId,
        stage: state.stage,
        playerHands: {
          right: state.handInfo.right.cards
            ? {
                cards: state.handInfo.right.cards,
                value: state.handInfo.right.playerValue,
                bet: state.handInfo.right.bet,
                availableActions: state.handInfo.right.availableActions,
                hasBlackjack: state.handInfo.right.playerHasBlackjack,
                hasBusted: state.handInfo.right.playerHasBusted,
              }
            : null,
          left: state.handInfo.left.cards
            ? {
                cards: state.handInfo.left.cards,
                value: state.handInfo.left.playerValue,
                bet: state.handInfo.left.bet,
                availableActions: state.handInfo.left.availableActions,
                hasBlackjack: state.handInfo.left.playerHasBlackjack,
                hasBusted: state.handInfo.left.playerHasBusted,
              }
            : null,
        },
        dealerCards: state.dealerCards || [],
        dealerValue: state.dealerCards ? null : undefined, // Hide dealer value until showdown
        finalResults:
          state.stage === "STAGE_DONE"
            ? {
                finalBet: state.finalBet,
                finalWin: state.finalWin,
                wonOnRight: state.wonOnRight,
                wonOnLeft: state.wonOnLeft,
              }
            : null,
      };

      return {
        text: `Player view for game ${gameId}`,
        content: [
          {
            type: "text",
            text: JSON.stringify(playerView, null, 2),
          },
        ],
      };
    }

    // Summary format (default)
    const summary = {
      gameId,
      stage: state.stage,
      playerCards: {
        right: state.handInfo.right.cards || [],
        left: state.handInfo.left.cards || [],
      },
      dealerCards: state.dealerCards || [],
      availableActions: {
        right: state.handInfo.right.availableActions || {},
        left: state.handInfo.left.availableActions || {},
      },
      bets: {
        initial: state.initialBet,
        final: state.finalBet,
      },
      gameOver: state.stage === "STAGE_DONE",
      results:
        state.stage === "STAGE_DONE"
          ? {
              finalWin: state.finalWin,
              wonOnRight: state.wonOnRight,
              wonOnLeft: state.wonOnLeft,
            }
          : null,
    };

    return {
      text: `Game summary for ${gameId}`,
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  },
});
