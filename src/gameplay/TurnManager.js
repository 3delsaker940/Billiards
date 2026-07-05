export class TurnManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentPlayer = 1;
    this.ballsRemaining = {
      solids: [1,2,3,4,5,6,7],
      stripes: [9,10,11,12,13,14,15],
    };
  }

  switchTurn() {
    this.currentPlayer = this.otherPlayer(this.currentPlayer);
    this.eventBus.emit('turn:changed', { player: this.currentPlayer });
  }

  otherPlayer(player) {
    return player === 1 ? 2 : 1;
  }

  markPocketed(ballId) {
    if (this.ballsRemaining.solids.includes(ballId)) {
      this.ballsRemaining.solids = this.ballsRemaining.solids.filter(id => id !== ballId);
    } else if (this.ballsRemaining.stripes.includes(ballId)) {
      this.ballsRemaining.stripes = this.ballsRemaining.stripes.filter(id => id !== ballId);
    }
    this.eventBus.emit('balls:updated', { ...this.ballsRemaining });
  }

  remainingBallsForGroup(group) {
    return this.ballsRemaining[group]?.length ?? 99;
  }

  reset() {
    this.currentPlayer = 1;
    this.ballsRemaining = { solids: [1,2,3,4,5,6,7], stripes: [9,10,11,12,13,14,15] };
  }
}