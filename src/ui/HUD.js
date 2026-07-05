export class HUD {
  constructor(eventBus) {
    this.turnEl = document.getElementById('turn-indicator');
    this.groupsEl = document.getElementById('groups-panel');
    this.foulEl = document.getElementById('foul-banner');
    this.gameOverEl = document.getElementById('game-over-panel');

    eventBus.on('turn:changed', ({ player }) => this.setTurn(player));
    eventBus.on('groups:assigned', (groups) => this.setGroups(groups));
    eventBus.on('foul:committed', ({ player, reason }) => this.showFoul(player, reason));
    eventBus.on('game:over', ({ winner, reason }) => this.showGameOver(winner, reason));
  }

  setTurn(player) {
    this.turnEl.textContent = `دور اللاعب ${player}`;
  }

  setGroups(groups) {
    const label = { solids: 'مصمتة', stripes: 'مخططة' };
    this.groupsEl.textContent =
      `اللاعب 1: ${label[groups[1]] ?? '—'}   |   اللاعب 2: ${label[groups[2]] ?? '—'}`;
  }

  showFoul(player, reason) {
    const messages = {
      SCRATCH: 'خطأ: الكرة البيضاء دخلت الجيب',
      NO_CONTACT: 'خطأ: لم تُلمس أي كرة',
      WRONG_BALL_FIRST: 'خطأ: تمت ملامسة كرة خاطئة أولاً',
      NO_RAIL_AFTER_CONTACT: 'خطأ: لم تلمس أي كرة الحافة بعد الاصطدام',
      HIT_EIGHT_BALL_EARLY: 'خطأ: ملامسة الكرة السوداء قبل أوانها',
      CUE_OFF_TABLE: 'خطأ: الكرة البيضاء خرجت عن الطاولة',
    };
    this.foulEl.textContent = `${messages[reason] ?? 'مخالفة'} — اللاعب ${player}`;
    this.foulEl.classList.remove('hidden');
    setTimeout(() => this.foulEl.classList.add('hidden'), 2500);
  }

  showGameOver(winner, reason) {
    this.gameOverEl.textContent = `اللاعب ${winner} فاز! (${reason})`;
    this.gameOverEl.classList.remove('hidden');
  }
}