import type { Route } from "./+types/blackjack";
import { getGame } from "../../tools/blackjack-new-game";
import type { State, Card, Hand } from "engine-blackjack";
import { postUIActionResult, uiActionResultToolCall } from "@mcp-ui/server";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Blackjack Game ${params.gameId}` },
    { name: "description", content: "Play blackjack online" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;
  const game = await getGame(gameId);

  if (!game) {
    throw new Response("Game not found", { status: 404 });
  }

  const state = game.getState();

  return {
    gameId,
    state,
  };
}

interface CardProps {
  card: Card;
  hidden?: boolean;
}

function CardComponent({ card, hidden = false }: CardProps) {
  if (hidden) {
    return (
      <div className="card w-16 h-24 bg-gray-800 border-2 border-gray-600 rounded-lg flex items-center justify-center shadow-lg">
        <div className="text-white text-xs">?</div>
      </div>
    );
  }

  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠"
  };

  const isRed = card.color === "R";

  return (
    <div className={`card w-16 h-24 bg-white border-2 rounded-lg flex flex-col items-center justify-between p-1 shadow-lg ${isRed ? 'text-red-500' : 'text-black'}`}>
      <div className="text-xs font-bold">{card.text}</div>
      <div className="text-lg">{suitSymbols[card.suite]}</div>
      <div className="text-xs font-bold transform rotate-180">{card.text}</div>
    </div>
  );
}

interface HandComponentProps {
  hand: Hand;
  position: "left" | "right";
  isActive: boolean;
}

function HandComponent({ hand, position, isActive }: HandComponentProps) {
  if (!hand.cards || hand.cards.length === 0) {
    return null;
  }

  const handValue = hand.playerValue.hi === hand.playerValue.lo
    ? hand.playerValue.hi
    : `${hand.playerValue.lo}/${hand.playerValue.hi}`;

  return (
    <div className={`flex flex-col items-center space-y-2 ${isActive ? 'ring-2 ring-blue-500 rounded-lg p-2' : ''}`}>
      <div className="text-sm font-semibold text-gray-600">{position.toUpperCase()} HAND</div>
      <div className="flex space-x-1">
        {hand.cards.map((card, index) => (
          <CardComponent key={index} card={card} />
        ))}
      </div>
      <div className="text-sm">
        <div>Value: {handValue}</div>
        <div>Bet: ${hand.bet}</div>
        {hand.playerHasBlackjack && <div className="text-green-600 font-bold">BLACKJACK!</div>}
        {hand.playerHasBusted && <div className="text-red-600 font-bold">BUSTED!</div>}
        {hand.playerHasSurrendered && <div className="text-orange-600 font-bold">SURRENDERED</div>}
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  availableActions: any;
  gameId: string;
  position: "left" | "right";
}

function ActionButtons({ availableActions, gameId, position }: ActionButtonsProps) {
  const handleHit = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-hit", {
      gameId,
      position
    }));
  };

  const handleStand = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-stand", {
      gameId,
      position
    }));
  };

  const handleDouble = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-double", {
      gameId,
      position
    }));
  };

  const handleSplit = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-split", {
      gameId
    }));
  };

  const handleSurrender = () => {
    postUIActionResult(uiActionResultToolCall("blackjack-surrender", {
      gameId
    }));
  };

  const handleInsurance = () => {
    // Default insurance bet is typically half the original bet
    postUIActionResult(uiActionResultToolCall("blackjack-insurance", {
      gameId,
      bet: 5 // Default insurance bet
    }));
  };

  const actions = [];

  if (availableActions.hit) {
    actions.push(
      <button
        key="hit"
        className="btn btn-primary"
        onClick={handleHit}
      >
        Hit
      </button>
    );
  }

  if (availableActions.stand) {
    actions.push(
      <button
        key="stand"
        className="btn btn-secondary"
        onClick={handleStand}
      >
        Stand
      </button>
    );
  }

  if (availableActions.double) {
    actions.push(
      <button
        key="double"
        className="btn btn-accent"
        onClick={handleDouble}
      >
        Double
      </button>
    );
  }

  if (availableActions.split) {
    actions.push(
      <button
        key="split"
        className="btn btn-warning"
        onClick={handleSplit}
      >
        Split
      </button>
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
      </button>
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
      </button>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {actions}
    </div>
  );
}

export default function BlackjackGame({ loaderData }: Route.ComponentProps) {
  const { gameId, state } = loaderData;

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
  const showDealerHoleCard = state.stage === "showdown" || state.stage === "done";

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Blackjack</h1>
          <div className="text-lg text-gray-200">Game ID: {gameId}</div>
          <div className="text-xl font-semibold text-yellow-300">
            {getStageDisplay(state.stage)}
          </div>
        </div>

        {/* Dealer Section */}
        <div className="bg-green-700 rounded-lg p-6 mb-8 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Dealer</h2>
          <div className="flex justify-center space-x-1 mb-4">
            {(state.dealerCards ?? []).map((card, index) => (
              <CardComponent key={index} card={card} />
            ))}
            {!showDealerHoleCard && (
              <CardComponent hidden={true} />
            )}
          </div>
          {state.dealerHasBlackjack && (
            <div className="text-yellow-300 font-bold">DEALER BLACKJACK!</div>
          )}
          {state.dealerHasBusted && (
            <div className="text-red-400 font-bold">DEALER BUSTED!</div>
          )}
        </div>

        {/* Player Section */}
        <div className="bg-green-600 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 text-center">Your Hands</h2>

          <div className="flex justify-center space-x-8 mb-6">
            <HandComponent
              hand={state.handInfo.right}
              position="right"
              isActive={isRightHandActive}
            />
            {state.handInfo.left.cards && state.handInfo.left.cards.length > 0 && (
              <HandComponent
                hand={state.handInfo.left}
                position="left"
                isActive={isLeftHandActive}
              />
            )}
          </div>

          {/* Action Buttons */}
          {isRightHandActive && (
            <div className="mb-4">
              <div className="text-center text-white mb-2">Right Hand Actions:</div>
              <ActionButtons
                availableActions={state.handInfo.right.availableActions}
                gameId={gameId}
                position="right"
              />
            </div>
          )}

          {isLeftHandActive && (
            <div className="mb-4">
              <div className="text-center text-white mb-2">Left Hand Actions:</div>
              <ActionButtons
                availableActions={state.handInfo.left.availableActions}
                gameId={gameId}
                position="left"
              />
            </div>
          )}

          {/* Game Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-white">
            <div className="bg-green-800 rounded p-3">
              <div className="text-sm text-gray-300">Initial Bet</div>
              <div className="text-lg font-bold">${state.initialBet}</div>
            </div>
            <div className="bg-green-800 rounded p-3">
              <div className="text-sm text-gray-300">Final Bet</div>
              <div className="text-lg font-bold">${state.finalBet}</div>
            </div>
            {state.stage === "done" && (
              <>
                <div className="bg-green-800 rounded p-3">
                  <div className="text-sm text-gray-300">Final Win</div>
                  <div className={`text-lg font-bold ${state.finalWin > 0 ? 'text-green-300' : state.finalWin < 0 ? 'text-red-300' : ''}`}>
                    ${state.finalWin}
                  </div>
                </div>
                <div className="bg-green-800 rounded p-3">
                  <div className="text-sm text-gray-300">Card Count</div>
                  <div className="text-lg font-bold">{state.cardCount}</div>
                </div>
              </>
            )}
          </div>

          {/* Deal Button for new games */}
          {state.stage === "ready" && (
            <div className="text-center mt-6">
              <button
                className="btn btn-success btn-lg"
                onClick={() => postUIActionResult(uiActionResultToolCall("blackjack-deal", {
                  gameId,
                  bet: 10
                }))}
              >
                Deal Cards ($10 bet)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
