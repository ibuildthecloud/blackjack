import { useEffect } from "react";
import { useRevalidator } from "react-router";
import type { Route } from "./+types/blackjack";
import { Game } from "$lib/game";
import type { Card } from "engine-blackjack";
import { postUIActionResult, uiActionResultToolCall } from "@mcp-ui/server";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Blackjack Game ${params.gameId}` },
    { name: "description", content: "Play blackjack online" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;
  const game = await Game.load(gameId);

  if (!game) {
    throw new Response("Game not found", { status: 404 });
  }

  const state = game.getPublicState();

  return {
    gameId,
    state,
  };
}

interface CardProps {
  card?: Card;
  hidden?: boolean;
}

function CardComponent({ card, hidden = false }: CardProps) {
  if (hidden) {
    return (
      <div className="card flex h-24 w-16 items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-800 shadow-lg">
        <div className="text-xs text-white">?</div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  const isRed = card.color === "R";

  return (
    <div
      className={`card flex h-24 w-16 flex-col items-center justify-between rounded-lg border-2 bg-white p-1 shadow-lg ${isRed ? "text-red-500" : "text-black"}`}
    >
      <div className="text-xs font-bold">{card.text}</div>
      <div className="text-lg">{suitSymbols[card.suite]}</div>
      <div className="rotate-180 transform text-xs font-bold">{card.text}</div>
    </div>
  );
}

interface HandComponentProps {
  hand:
    | {
        cards: Card[];
        bet?: number;
        availableActions: {
          double?: boolean;
          split?: boolean;
          insurance?: boolean;
          hit?: boolean;
          stand?: boolean;
          surrender?: boolean;
        };
      }
    | undefined;
  position: "left" | "right";
  isActive: boolean;
}

function HandComponent({ hand, position, isActive }: HandComponentProps) {
  if (!hand || !hand.cards || hand.cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col items-center space-y-2 ${isActive ? "rounded-lg p-2 ring-2 ring-blue-500" : ""}`}
    >
      <div className="text-sm font-semibold text-gray-600">
        {position.toUpperCase()} HAND
      </div>
      <div className="flex space-x-1">
        {hand.cards.map((card, index) => (
          <CardComponent key={index} card={card} />
        ))}
      </div>
      <div className="text-sm">
        <div>Bet: ${hand.bet || 0}</div>
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  availableActions: {
    double?: boolean;
    split?: boolean;
    insurance?: boolean;
    hit?: boolean;
    stand?: boolean;
    surrender?: boolean;
  };
  gameId: string;
  position: "left" | "right";
}

function ActionButtons({
  availableActions,
  gameId,
  position,
}: ActionButtonsProps) {
  const handleHit = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-hit", {
        gameId,
        position,
      }),
    );
  };

  const handleStand = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-stand", {
        position,
      }),
    );
  };

  const handleDouble = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-double", {
        position,
      }),
    );
  };

  const handleSplit = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-split", {
      }),
    );
  };

  const handleSurrender = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-surrender", {
      }),
    );
  };

  const handleInsurance = () => {
    // Default insurance bet is typically half the original bet
    postUIActionResult(
      uiActionResultToolCall("blackjack-insurance", {
        bet: 5, // Default insurance bet
      }),
    );
  };

  const actions = [];

  if (availableActions.hit) {
    actions.push(
      <button key="hit" className="btn btn-primary" onClick={handleHit}>
        Hit
      </button>,
    );
  }

  if (availableActions.stand) {
    actions.push(
      <button key="stand" className="btn btn-secondary" onClick={handleStand}>
        Stand
      </button>,
    );
  }

  if (availableActions.double) {
    actions.push(
      <button key="double" className="btn btn-accent" onClick={handleDouble}>
        Double
      </button>,
    );
  }

  if (availableActions.split) {
    actions.push(
      <button key="split" className="btn btn-warning" onClick={handleSplit}>
        Split
      </button>,
    );
  }

  if (availableActions.surrender) {
    actions.push(
      <button
        key="surrender"
        className="btn btn-error"
        onClick={handleSurrender}
      >
        Surrender
      </button>,
    );
  }

  if (availableActions.insurance) {
    actions.push(
      <button
        key="insurance"
        className="btn btn-info"
        onClick={handleInsurance}
      >
        Insurance
      </button>,
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return <div className="flex flex-wrap justify-center gap-2">{actions}</div>;
}

export default function BlackjackGame({ loaderData }: Route.ComponentProps) {
  const { gameId, state } = loaderData;
  const revalidator = useRevalidator();

  useEffect(() => {
    // Auto-refresh during active gameplay
    if (
      state.stage !== "done" &&
      state.stage !== "ready" &&
      state.stage !== "showdown"
    ) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 1000); // Refresh every second during gameplay

      return () => clearInterval(interval);
    }
  }, [state.stage, revalidator]);

  const getStageDisplay = (stage: string) => {
    switch (stage) {
      case "ready":
        return "Ready to Deal";
      case "player-turn-right":
        return "Your Turn (Right Hand)";
      case "player-turn-left":
        return "Your Turn (Left Hand)";
      case "dealer-turn":
        return "Dealer's Turn";
      case "showdown":
        return "Showdown";
      case "done":
        return "Game Complete";
      default:
        return stage;
    }
  };

  const isRightHandActive = state.stage === "player-turn-right";
  const isLeftHandActive = state.stage === "player-turn-left";
  const showDealerHoleCard =
    state.stage === "showdown" || state.stage === "done";

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Blackjack</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="text-xl font-semibold text-yellow-300">
              {getStageDisplay(state.stage || "ready")}
            </div>
            <button
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => revalidator.revalidate()}
              title="Refresh game state"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Dealer Section */}
        <div className="mb-8 rounded-lg bg-green-700 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold text-white">Dealer</h2>
          <div className="mb-4 flex justify-center space-x-1">
            {(state.dealerCards ?? []).map((card: Card, index: number) => (
              <CardComponent key={index} card={card} />
            ))}
            {!showDealerHoleCard && <CardComponent hidden={true} />}
          </div>
          {state.dealerHasBlackjack && (
            <div className="font-bold text-yellow-300">DEALER BLACKJACK!</div>
          )}
          {state.dealerHasBusted && (
            <div className="font-bold text-red-400">DEALER BUSTED!</div>
          )}
        </div>

        {/* Player Section */}
        <div className="rounded-lg bg-green-600 p-6">
          <h2 className="mb-4 text-center text-xl font-bold text-white">
            Your Hands
          </h2>

          <div className="mb-6 flex justify-center space-x-8">
            {state.handInfo?.right && (
              <HandComponent
                hand={state.handInfo.right}
                position="right"
                isActive={isRightHandActive}
              />
            )}
            {state.handInfo?.left &&
              state.handInfo.left.cards &&
              state.handInfo.left.cards.length > 0 && (
                <HandComponent
                  hand={state.handInfo.left}
                  position="left"
                  isActive={isLeftHandActive}
                />
              )}
          </div>

          {/* Action Buttons */}
          {isRightHandActive && state.handInfo?.right && (
            <div className="mb-4">
              <div className="mb-2 text-center text-white">
                Right Hand Actions:
              </div>
              <ActionButtons
                availableActions={state.handInfo.right.availableActions}
                gameId={gameId}
                position="right"
              />
            </div>
          )}

          {isLeftHandActive && state.handInfo?.left && (
            <div className="mb-4">
              <div className="mb-2 text-center text-white">
                Left Hand Actions:
              </div>
              <ActionButtons
                availableActions={state.handInfo.left.availableActions}
                gameId={gameId}
                position="left"
              />
            </div>
          )}

          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-4 text-center text-white">
            <div className="rounded bg-green-800 p-3">
              <div className="text-sm text-gray-300">Available Money</div>
              <div className="text-lg font-bold">${state.money ?? 0}</div>
            </div>
            <div className="rounded bg-green-800 p-3">
              <div className="text-sm text-gray-300">Game Stage</div>
              <div className="text-lg font-bold">
                {getStageDisplay(state.stage || "ready")}
              </div>
            </div>
          </div>

          {/* Game Result Section - only shown when game is done */}
          {state.stage === "done" && state.gameResult && (
            <div className="mt-4 rounded-lg bg-blue-800 p-4">
              <h3 className="mb-2 text-center text-lg font-bold text-white">
                Game Result
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center text-white">
                <div className="rounded bg-blue-900 p-3">
                  <div className="text-sm text-gray-300">Final Bet</div>
                  <div className="text-lg font-bold">
                    ${state.gameResult.finalBet}
                  </div>
                </div>
                <div className="rounded bg-blue-900 p-3">
                  <div className="text-sm text-gray-300">Won on Right</div>
                  <div
                    className={`text-lg font-bold ${state.gameResult.wonOnRight > 0 ? "text-green-300" : state.gameResult.wonOnRight < 0 ? "text-red-300" : ""}`}
                  >
                    ${state.gameResult.wonOnRight}
                  </div>
                </div>
                <div className="rounded bg-blue-900 p-3">
                  <div className="text-sm text-gray-300">Won on Left</div>
                  <div
                    className={`text-lg font-bold ${state.gameResult.wonOnLeft > 0 ? "text-green-300" : state.gameResult.wonOnLeft < 0 ? "text-red-300" : ""}`}
                  >
                    ${state.gameResult.wonOnLeft}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm text-gray-300">Total Winnings</div>
                <div
                  className={`text-xl font-bold ${state.gameResult.wonOnRight + state.gameResult.wonOnLeft > 0 ? "text-green-300" : state.gameResult.wonOnRight + state.gameResult.wonOnLeft < 0 ? "text-red-300" : ""}`}
                >
                  ${state.gameResult.wonOnRight + state.gameResult.wonOnLeft}
                </div>
              </div>
            </div>
          )}

          {/* Deal Button for new games */}
          {state.stage === "ready" && (
            <div className="mt-6 text-center">
              <button
                className="btn btn-lg btn-success"
                onClick={() =>
                  postUIActionResult(
                    uiActionResultToolCall("blackjack-new-game", {
                      bet: 10,
                    }),
                  )
                }
              >
                Deal Cards ($10 bet)
              </button>
            </div>
          )}

          {/* New Game Button when game is finished */}
          {state.stage === "done" && (
            <div className="mt-6 text-center">
              <button
                className="btn btn-lg btn-primary"
                onClick={() =>
                  postUIActionResult(
                    uiActionResultToolCall("blackjack-new-game", {
                      bet: 10,
                    }),
                  )
                }
              >
                New Game ($10 bet)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
