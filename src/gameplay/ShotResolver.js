export class ShotResolver {
  constructor(eventBus, foulDetector, turnManager) {
    this.eventBus = eventBus;
    this.foulDetector = foulDetector;
    this.turnManager = turnManager;
  }

  resolve({ playerGroup, isPlayerOnEightBall, eightBallPocketed }) {
    const foulReason = this.foulDetector.evaluate(
      playerGroup,
      isPlayerOnEightBall,
    );
    const pocketed = [...this.foulDetector.pocketedBalls];

    const result = {
      foul: foulReason,
      pocketedBalls: pocketed,
      scratched: this.foulDetector.cueScratched,
      eightBallPocketed,
      continuesTurn: false,
      gameOver: null,
    };

    if (eightBallPocketed) {
      if (!isPlayerOnEightBall || this.foulDetector.cueScratched) {
        result.gameOver = {
          winner: this.turnManager.otherPlayer(this.turnManager.currentPlayer),
          reason: "illegal-8-ball",
        };
      } else if (!foulReason) {
        result.gameOver = {
          winner: this.turnManager.currentPlayer,
          reason: "legal-8-ball",
        };
      }
    }

    if (!result.gameOver) {
      pocketed.forEach((id) => this.turnManager.markPocketed(id));
      const pocketedOwnGroup = playerGroup
        ? pocketed.some((id) => this._belongs(id, playerGroup))
        : pocketed.length > 0;

      result.continuesTurn =
        !foulReason && pocketedOwnGroup && pocketed.length > 0;
    }

    this.eventBus.emit("shot:resolved", result);
    this.foulDetector.reset();
    return result;
  }

  _belongs(id, group) {
    if (group === "solids") return id >= 1 && id <= 7;
    if (group === "stripes") return id >= 9 && id <= 15;
    return false;
  }
}
