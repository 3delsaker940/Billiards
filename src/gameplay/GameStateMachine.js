// gameplay/GameStateMachine.js
export const States = Object.freeze({
  BREAK: 'BREAK',
  AIMING: 'AIMING',
  POWER_CHARGING: 'POWER_CHARGING',
  SHOT_IN_PROGRESS: 'SHOT_IN_PROGRESS', // physics settling, input locked
  RESOLVING_SHOT: 'RESOLVING_SHOT',      // rules evaluate what happened
  BALL_IN_HAND: 'BALL_IN_HAND',
  GAME_OVER: 'GAME_OVER',
});

export class GameStateMachine {
  constructor(eventBus) {
    this.state = States.BREAK;
    this.eventBus = eventBus;
    this.transitions = {
      [States.BREAK]:            [States.SHOT_IN_PROGRESS, States.AIMING],
      [States.AIMING]:           [States.POWER_CHARGING, States.AIMING],
      [States.POWER_CHARGING]:   [States.SHOT_IN_PROGRESS, States.AIMING],
      [States.SHOT_IN_PROGRESS]: [States.RESOLVING_SHOT],
      [States.RESOLVING_SHOT]:   [States.AIMING, States.BALL_IN_HAND, States.GAME_OVER],
      [States.BALL_IN_HAND]:     [States.AIMING],
    };
  }

  transition(to) {
    if (!this.transitions[this.state]?.includes(to)) {
      console.warn(`Illegal transition: ${this.state} -> ${to}`);
      return false;
    }
    const from = this.state;
    this.state = to;
    this.eventBus.emit('state:changed', { from, to });
    return true;
  }

  /** ⭐ المصدر الوحيد لإصدار 'shot:settled' — مرة واحدة بالضبط لكل رمية */
  checkSettled(balls) {
    if (this.state !== States.SHOT_IN_PROGRESS) return;
    const allStopped = balls.every(b => !b.body.isMoving());
    if (allStopped) {
      this.transition(States.RESOLVING_SHOT);
      this.eventBus.emit('shot:settled'); // ينبعث فقط هون، ولا مكان تاني بالكود
    }
  }
}