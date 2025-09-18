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
      <div className="relative flex h-24 w-16 items-center justify-center rounded-lg border border-gray-300 bg-gradient-to-br from-red-900 via-blue-900 to-red-900 shadow-xl md:h-48 md:w-32 md:rounded-xl md:shadow-2xl">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-800 to-red-800 opacity-80 md:rounded-xl"></div>
        <div className="relative text-sm font-bold text-white drop-shadow-lg md:text-2xl">
          ?
        </div>
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
    <div className="relative flex h-24 w-16 transform flex-col items-center justify-between rounded-lg border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-1 shadow-xl transition-transform duration-200 hover:scale-105 md:h-48 md:w-32 md:rounded-xl md:border-2 md:p-3 md:shadow-2xl">
      {/* Card background texture */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white via-gray-50 to-gray-100 opacity-50 md:rounded-xl"></div>

      {/* Top left corner */}
      <div
        className={`relative z-10 flex flex-col items-center ${isRed ? "text-red-600" : "text-gray-900"}`}
      >
        <div className="text-xs leading-none font-bold md:text-lg">
          {card.text}
        </div>
        <div className="text-xs leading-none md:text-sm">
          {suitSymbols[card.suite]}
        </div>
      </div>

      {/* Center suit symbol */}
      <div
        className={`relative z-10 ${isRed ? "text-red-600" : "text-gray-900"}`}
      >
        <div className="text-xl drop-shadow-sm md:text-5xl">
          {suitSymbols[card.suite]}
        </div>
      </div>

      {/* Bottom right corner (rotated) */}
      <div
        className={`relative z-10 flex rotate-180 transform flex-col items-center ${isRed ? "text-red-600" : "text-gray-900"}`}
      >
        <div className="text-xs leading-none font-bold md:text-lg">
          {card.text}
        </div>
        <div className="text-xs leading-none md:text-sm">
          {suitSymbols[card.suite]}
        </div>
      </div>

      {/* Subtle inner border for depth */}
      <div className="pointer-events-none absolute inset-0.5 rounded border border-gray-200 md:inset-1 md:rounded-lg"></div>
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
  insurance?: number;
}

function HandComponent({
  hand,
  position,
  isActive,
  insurance,
}: HandComponentProps) {
  if (!hand || !hand.cards || hand.cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col items-center space-y-1 md:space-y-2 ${isActive ? "rounded-lg p-1 ring-1 ring-blue-500 md:p-2 md:ring-2" : ""}`}
    >
      {position === "left" && (
        <div className="text-xs font-semibold text-gray-600 md:text-sm">
          {position.toUpperCase()} HAND
        </div>
      )}
      <div className="flex space-x-0.5 md:space-x-1">
        {hand.cards.map((card, index) => (
          <CardComponent key={index} card={card} />
        ))}
      </div>
      <div className="text-xs md:text-sm">
        <div>Bet: ${hand.bet || 0}</div>
        {position === "right" && insurance && (
          <div>Insurance: ${insurance}</div>
        )}
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
    postUIActionResult(uiActionResultToolCall("blackjack-split", {}));
  };

  const handleSurrender = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-surrender", {}));
  };

  const handleInsurance = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-take-insurance", {}));
  };

  const declineInsurance = () => {
    postUIActionResult(
      uiActionResultToolCall("blackjack-decline-insurance", {}),
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
        Take Insurance
      </button>,
    );
    actions.push(
      <button
        key="insurance"
        className="btn btn-info"
        onClick={declineInsurance}
      >
        Decline Insurance
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
        return "Your Turn";
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
  const newBidAmount = state.gameResult?.finalBet || 10;
  const hasLeftHand =
    state.handInfo?.left &&
    state.handInfo.left.cards &&
    state.handInfo.left.cards.length > 0;

  return (
    <div className="min-h-screen bg-green-800 p-2 md:p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 text-center md:mb-6">
          <h1 className="mb-1 text-xl font-bold text-white md:mb-2 md:text-3xl">
            Blackjack
          </h1>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <div className="text-sm font-semibold text-yellow-300 md:text-xl">
              {getStageDisplay(state.stage || "ready")}
            </div>
            <button
              className="btn hidden btn-circle btn-ghost btn-sm"
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
        <div className="mb-4 rounded-lg bg-green-700 p-3 text-center md:mb-8 md:p-6">
          <h2 className="mb-2 text-lg font-bold text-white md:mb-4 md:text-xl">
            Dealer
          </h2>
          <div className="mb-2 flex justify-center space-x-1 md:mb-4">
            {(state.dealerCards ?? []).map((card: Card, index: number) => (
              <CardComponent key={index} card={card} />
            ))}
            {!showDealerHoleCard && <CardComponent hidden={true} />}
          </div>
          {state.dealerHasBlackjack && (
            <div className="text-sm font-bold text-yellow-300 md:text-base">
              DEALER BLACKJACK!
            </div>
          )}
          {state.dealerHasBusted && (
            <div className="text-sm font-bold text-red-400 md:text-base">
              DEALER BUSTED!
            </div>
          )}
        </div>

        {/* Player Section */}
        <div className="rounded-lg bg-green-600 p-3 md:p-6">
          {hasLeftHand && (
            <h2 className="mb-2 text-center text-lg font-bold text-white md:mb-4 md:text-xl">
              Your Hands
            </h2>
          )}

          <div className="mb-3 flex justify-center space-x-4 md:mb-6 md:space-x-8">
            {state.handInfo?.right && (
              <HandComponent
                hand={state.handInfo.right}
                position="right"
                isActive={isRightHandActive}
                insurance={state.insurance}
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
            <div className="mb-2 md:mb-4">
              {hasLeftHand && (
                <div className="mb-1 text-center text-sm text-white md:mb-2 md:text-base">
                  Right Hand Actions:
                </div>
              )}
              <ActionButtons
                availableActions={state.handInfo.right.availableActions}
                gameId={gameId}
                position="right"
              />
            </div>
          )}

          {isLeftHandActive && state.handInfo?.left && (
            <div className="mb-2 md:mb-4">
              <div className="mb-1 text-center text-sm text-white md:mb-2 md:text-base">
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
          <div className="grid grid-cols-1 gap-2 text-center text-white md:gap-4">
            <div className="rounded bg-green-800 p-2 md:p-3">
              <div className="text-xs text-gray-300 md:text-sm">
                Available Money
              </div>
              <div className="text-base font-bold md:text-lg">
                ${state.money ?? 0}
              </div>
            </div>
          </div>

          {/* Game Result Section - only shown when game is done */}
          {state.stage === "done" && state.gameResult && (
            <div className="mt-2 rounded-lg bg-blue-800 p-2 md:mt-4 md:p-4">
              <h3 className="mb-1 text-center text-base font-bold text-white md:mb-2 md:text-lg">
                Game Result
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center text-white md:gap-4">
                <div className="rounded bg-blue-900 p-2 md:p-3">
                  <div className="text-xs text-gray-300 md:text-sm">
                    Outcome
                  </div>
                  <div className="text-sm font-bold md:text-lg">
                    {state.playerHasBlackjack && (
                      <span className="text-yellow-300">BLACKJACK!</span>
                    )}
                    {state.playerHasBusted && (
                      <span className="text-red-300">BUSTED</span>
                    )}
                    {state.playerHasSurrendered && (
                      <span className="text-orange-300">SURRENDERED</span>
                    )}
                    {!state.playerHasBlackjack &&
                      !state.playerHasBusted &&
                      !state.playerHasSurrendered && (
                        <span
                          className={
                            state.gameResult.won > 0
                              ? "text-green-300"
                              : state.gameResult.won < 0
                                ? "text-red-300"
                                : "text-gray-300"
                          }
                        >
                          {state.gameResult.won > 0
                            ? "WON"
                            : state.gameResult.won < 0
                              ? "LOST"
                              : "PUSH"}
                        </span>
                      )}
                  </div>
                </div>
                <div className="rounded bg-blue-900 p-2 md:p-3">
                  <div className="text-xs text-gray-300 md:text-sm">Amount</div>
                  <div
                    className={`text-sm font-bold md:text-lg ${state.gameResult.won > 0 ? "text-green-300" : state.gameResult.won < 0 ? "text-red-300" : "text-gray-300"}`}
                  >
                    ${state.gameResult.won}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deal Button for new games */}
          {state.stage === "ready" && (
            <div className="mt-3 text-center md:mt-6">
              <button
                className="btn btn-sm btn-success md:btn-lg"
                onClick={() =>
                  postUIActionResult(
                    uiActionResultToolCall("blackjack-new-game", {
                      bet: newBidAmount,
                    }),
                  )
                }
              >
                Deal Cards (${newBidAmount} bet)
              </button>
            </div>
          )}

          {/* New Game Button when game is finished */}
          {state.stage === "done" && (
            <div className="mt-3 text-center md:mt-6">
              <button
                className="btn btn-sm btn-primary md:btn-lg"
                onClick={() =>
                  postUIActionResult(
                    uiActionResultToolCall("blackjack-new-game", {
                      bet: newBidAmount,
                    }),
                  )
                }
              >
                New Game (${newBidAmount} bet)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
