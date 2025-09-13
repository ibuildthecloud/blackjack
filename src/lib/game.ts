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
    wonOnRight: State["wonOnRight"];
    wonOnLeft: State["wonOnLeft"];
  };
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
    const game = new CardGame(undefined, presets.getRules(rules));
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
    return {
      money:
        this.money -
        (this.state?.handInfo?.left?.bet || 0) -
        (this.state?.handInfo?.right?.bet || 0),
      stage: this.state?.stage,
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
        dealerHasBusted: this.state?.dealerHasBlackjack,
      }),
      ...(this.state?.stage === "done" && {
        gameResult: {
          finalBet: this.state?.finalBet,
          wonOnRight: this.state?.wonOnRight,
          wonOnLeft: this.state?.wonOnLeft,
        },
      }),
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

  private validateState(newState: State) {
    if (newState.stage === "invalid") {
      throw new Error(
        `Invalid action: type=${newState.history.pop()?.type} payload=${newState.history.pop()?.payload}`,
      );
    }
    const bet =
      (newState.handInfo.left?.bet || 0) + (newState.handInfo.right?.bet || 0);
    if (bet > this.money) {
      throw new Error("Not enough money");
    }
  }

  private async dispatch(action: Action, game?: InstanceType<typeof CardGame>) {
    if (!game) {
      game = new CardGame(this.state);
    }
    const newState = game.dispatch(action);
    this.validateState(newState);
    if (newState.stage === "done") {
      this.money += newState.wonOnRight + newState.wonOnLeft;
    }
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
