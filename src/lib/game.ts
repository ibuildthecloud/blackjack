import type { Rule, SideBetsInfo, State, Action } from "engine-blackjack";
import blackjack from "engine-blackjack";
const { presets, actions, Game: CardGame } = blackjack;
import { loadGameState, saveGameState } from "$lib/db";

export type PublicState = {
  money?: number;
  stage?: State["stage"];
  handInfo?: {
    left?: {
      cards: State["handInfo"]["left"]["cards"];
      bet: State["handInfo"]["left"]["bet"];
      availableActions: State["handInfo"]["left"]["availableActions"];
    };
    right?: {
      cards: State["handInfo"]["right"]["cards"];
      bet: State["handInfo"]["right"]["bet"];
      availableActions: State["handInfo"]["left"]["availableActions"];
    };
  };
  rules?: State["rules"];
  dealerCards?: State["dealerCards"];
  dealerHasBusted?: State["dealerHasBusted"];
  dealerHasBlackjack?: State["dealerHasBlackjack"];
  gameResult?: {
    finalBet: State["finalBet"];
    won: number;
  };
  insurance?: number;
  playerHasBlackjack?: boolean;
  playerHasBusted?: boolean;
  playerHasSurrendered?: boolean;
};

export class Game {
  state?: State;
  money: number;
  readonly id: string;

  constructor(id: string, money: number, state?: State) {
    this.id = id;
    this.money = money;
    this.state = state;
  }

  async deal(bet: number, sideBets?: SideBetsInfo, rules?: Rule) {
    const game = new CardGame(undefined, presets.getRules(rules || {}));
    await this.dispatch(
      actions.deal({
        bet,
        sideBets: sideBets || {
          luckyLucky: 0,
          perfectPairs: 0,
        },
      }),
      game,
    );
  }

  async split() {
    await this.dispatch(actions.split());
  }

  async surrender() {
    await this.dispatch(actions.surrender());
  }

  getPublicState(): PublicState {
    const bet = this.state?.finalBet || this.getCurrentBet();
    const won =
      (this.state?.wonOnRight || 0) +
      (this.state?.wonOnLeft || 0) +
      (this.state?.dealerHasBlackjack
        ? this.state?.sideBetsInfo?.insurance?.win || 0
        : 0);
    return {
      money: this.money - bet + won,
      stage: this.state?.stage,
      insurance: this.state?.sideBetsInfo?.insurance?.risk,
      handInfo: {
        left: this.state?.handInfo.left && {
          cards: this.state.handInfo.left.cards,
          bet: this.state.handInfo.left.bet,
          availableActions: this.state.handInfo.left.availableActions,
        },
        right: this.state?.handInfo.right && {
          cards: this.state.handInfo.right.cards,
          bet: this.state.handInfo.right.bet,
          availableActions: this.state.handInfo.right.availableActions,
        },
      },
      rules: this.state?.rules,
      dealerCards: this.state?.dealerCards,
      ...(this.state?.dealerHasBusted && {
        dealerHasBusted: this.state?.dealerHasBusted,
      }),
      ...(this.state?.dealerHasBlackjack && {
        dealerHasBlackjack: this.state?.dealerHasBlackjack,
      }),
      ...(this.state?.stage === "done" && {
        gameResult: {
          finalBet: bet,
          won: won - bet,
        },
      }),
      playerHasBlackjack:
        this.state?.handInfo?.right?.playerHasBlackjack ||
        this.state?.handInfo?.left?.playerHasBlackjack,
      playerHasBusted:
        this.state?.handInfo?.right?.playerHasBusted &&
        this.state?.handInfo?.left?.playerHasBusted,
      playerHasSurrendered:
        this.state?.handInfo?.right?.playerHasSurrendered &&
        this.state?.handInfo?.left?.playerHasSurrendered,
    };
  }

  toString() {
    return JSON.stringify(this.getPublicState());
  }

  async stand(position: "right" | "left" = "right") {
    await this.dispatch(
      actions.stand({
        position,
      }),
    );
  }

  async hit(position: "right" | "left" = "right") {
    await this.dispatch(
      actions.hit({
        position,
      }),
    );
  }

  async double(position: "right" | "left" = "right") {
    await this.dispatch(
      actions.double({
        position,
      }),
    );
  }

  async insurance(bet: number) {
    await this.dispatch(
      actions.insurance({
        bet,
      }),
    );
  }

  private getCurrentBet() {
    return (
      (this.state?.handInfo.left?.bet || 0) +
      (this.state?.handInfo.right?.bet || 0)
    );
  }

  private validateState(newState: State) {
    if (newState.stage === "invalid") {
      throw new Error(
        `Invalid action: type=${newState.history.pop()?.type} payload=${newState.history.pop()?.payload}`,
      );
    }
    if (this.getCurrentBet() > this.money) {
      throw new Error("Not enough money");
    }
  }

  private async dispatch(action: Action, game?: InstanceType<typeof CardGame>) {
    if (!game) {
      game = new CardGame(this.state);
    }
    if (game.getState()?.stage === "done") {
      throw new Error("Game is already done, start new game");
    }
    if (game.getState()?.stage === "invalid") {
      throw new Error("Game is in invalid state, start new game");
    }
    this.validateState(game.getState());
    const newState = game.dispatch(action);
    this.validateState(newState);
    this.state = newState;
    return this.save();
  }

  private async save() {
    if (this.state) {
      await saveGameState(this.id, {
        state: this.state,
        money: this.money,
      });
    }
  }

  static async load(id: string): Promise<Game | null> {
    const gameState = await loadGameState(id);
    if (!gameState) {
      return null;
    }
    return new Game(id, gameState.money, gameState.state);
  }

  static async fromSession(ctx: { sessionId?: string }) {
    const gameId = Game.getGameIdFromSession(ctx);
    const game = await Game.load(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    return game;
  }

  static getGameIdFromSession(ctx: { sessionId?: string }) {
    const id = ctx.sessionId;
    if (!id) {
      throw new Error("session id is required");
    }
    return id;
  }
}
