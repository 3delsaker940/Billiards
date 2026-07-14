export class FoulDetector {
  constructor() {
    this.reset();
  }

  reset() {
    this.firstContactBallId = null;
    this.cueScratched = false;
    this.pocketedBalls = [];
    this.railsHitAfterFirstContact = 0;
    this.cueBallLeftTable = false;
  }

  recordContact(idA, idB, type) {
    if (type === "BALL_BALL" && this.firstContactBallId === null) {
      const objectId = idA === 0 ? idB : idB === 0 ? idA : null;
      if (objectId !== null) this.firstContactBallId = objectId;
    }
    if (type === "BALL_CUSHION" && this.firstContactBallId !== null) {
      this.railsHitAfterFirstContact++;
    }
  }

  recordPocketed(ballId) {
    if (ballId === 0) {
      this.cueScratched = true;
      return;
    }
    this.pocketedBalls.push(ballId);
  }

  recordCueBallOffTable() {
    this.cueBallLeftTable = true;
  }

  /**
   * @param {'solids'|'stripes'|null} playerGroup
   * @param {boolean} isPlayerOnEightBall
   * @returns {string|null}
   */
  evaluate(playerGroup, isPlayerOnEightBall) {
    if (this.cueScratched) return "SCRATCH";
    if (this.cueBallLeftTable) return "CUE_OFF_TABLE";
    if (this.firstContactBallId === null) return "NO_CONTACT";

    if (playerGroup) {
      const hitOwnBall = this._ballBelongsToGroup(
        this.firstContactBallId,
        playerGroup,
      );
      if (isPlayerOnEightBall) {
        if (this.firstContactBallId !== 8) return "WRONG_BALL_FIRST";
      } else if (!hitOwnBall && this.firstContactBallId !== 8) {
        return "WRONG_BALL_FIRST";
      } else if (this.firstContactBallId === 8 && !isPlayerOnEightBall) {
        return "HIT_EIGHT_BALL_EARLY";
      }
    }

    const anyPocketed = this.pocketedBalls.length > 0;
    if (!anyPocketed && this.railsHitAfterFirstContact === 0) {
      return "NO_RAIL_AFTER_CONTACT";
    }
    return null;
  }

  _ballBelongsToGroup(id, group) {
    if (group === "solids") return id >= 1 && id <= 7;
    if (group === "stripes") return id >= 9 && id <= 15;
    return false;
  }
}
