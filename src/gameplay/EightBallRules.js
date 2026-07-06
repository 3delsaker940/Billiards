// gameplay/EightBallRules.js
export class EightBallRules {
  constructor(eventBus, turnManager) {
    this.eventBus = eventBus;
    this.turnManager = turnManager;
    this.groupsAssigned = false;
    this.playerGroups = { 1: null, 2: null }; // 'solids' | 'stripes'
    this.shotLog = { firstContact: null, pocketed: [], cueScratched: false, railsHitAfterContact: 0 };

    eventBus.on('physics:contact', (e) => this.onContact(e));
    eventBus.on('ball:pocketed', (e) => this.onPocketed(e));
    eventBus.on('shot:settled', () => this.evaluateShot());
  }

  resetShotLog() {
    this.shotLog = { firstContact: null, pocketed: [], cueScratched: false, railsHitAfterContact: 0 };
  }

  onContact({ idA, idB, type }) {
    if (type === 'BALL_BALL' && this.shotLog.firstContact === null) {
      const objectBallId = idA === 0 ? idB : idA; // 0 reserved for cue ball
      this.shotLog.firstContact = objectBallId;
    }
    if (type === 'BALL_CUSHION' && this.shotLog.firstContact !== null) {
      this.shotLog.railsHitAfterContact++;
    }
  }

  onPocketed({ ballId }) {
    if (ballId === 0) { this.shotLog.cueScratched = true; return; }
    this.shotLog.pocketed.push(ballId);
  }

  evaluateShot() {
    const currentPlayer = this.turnManager.currentPlayer;
    const foul = this.detectFoul(currentPlayer);
    const legalGroup = this.playerGroups[currentPlayer];
    const eightPocketed = this.shotLog.pocketed.includes(8);

    let gameOverInfo = null;

    if (eightPocketed) {
      const legallyOnEight = this.isPlayerOnEightBall(currentPlayer);
      if (!legallyOnEight || this.shotLog.cueScratched) {
        gameOverInfo = { winner: this.turnManager.otherPlayer(currentPlayer), reason: '8-ball foul' };
      } else if (legallyOnEight && !foul) {
        gameOverInfo = { winner: currentPlayer, reason: '8-ball legally pocketed' };
      }
    }

    if (gameOverInfo) {
      this.eventBus.emit('game:over', gameOverInfo);
      // نُصدر shot:evaluated أيضاً هون عشان الكرات المُدخلة (بما فيها السوداء) تختفي من المشهد
      this.eventBus.emit('shot:evaluated', {
        pocketed: [...this.shotLog.pocketed],
        cueScratched: this.shotLog.cueScratched,
        foul,
        gameOver: true,
      });
      this.resetShotLog();
      return;
    }

    if (!this.groupsAssigned && this.shotLog.pocketed.length > 0 && !foul) {
      this.assignGroups(currentPlayer, this.shotLog.pocketed);
    }

    let ballInHandRequested = false;

    if (foul) {
      this.eventBus.emit('foul:committed', { player: currentPlayer, reason: foul });
      this.turnManager.switchTurn();
      ballInHandRequested = true;
    } else {
      const pocketedOwnGroup = this.shotLog.pocketed.some(id => this.ballBelongsToGroup(id, legalGroup));
      if (!pocketedOwnGroup || this.shotLog.pocketed.length === 0) {
        this.turnManager.switchTurn();
      }
    }

    // ⭐ حدث واحد موحّد يحمل كل المعلومات — main.js يقرر عليه الانتقال الصحيح للحالة
    this.eventBus.emit('shot:evaluated', {
      pocketed: [...this.shotLog.pocketed],
      cueScratched: this.shotLog.cueScratched,
      foul,
      gameOver: false,
      requestBallInHand: ballInHandRequested,
    });

    if (ballInHandRequested) {
      this.eventBus.emit('request:ball-in-hand', { player: this.turnManager.currentPlayer });
    }

    this.resetShotLog();
  }

  detectFoul(player) {
    if (this.shotLog.cueScratched) return 'SCRATCH';
    if (this.shotLog.firstContact === null) return 'NO_CONTACT';

    const group = this.playerGroups[player];
    if (this.groupsAssigned && group) {
      const isOwnBall = this.ballBelongsToGroup(this.shotLog.firstContact, group);
      const onEightBall = this.isPlayerOnEightBall(player);
      if (onEightBall && this.shotLog.firstContact !== 8) return 'WRONG_BALL_FIRST';
      if (!onEightBall && !isOwnBall && this.shotLog.firstContact !== 8) return 'WRONG_BALL_FIRST';
    }

    // Rule: if no ball pocketed, at least one rail must be hit after contact
    if (this.shotLog.pocketed.length === 0 && this.shotLog.railsHitAfterContact === 0) {
      return 'NO_RAIL_AFTER_CONTACT';
    }
    return null;
  }

  ballBelongsToGroup(id, group) {
    if (group === 'solids') return id >= 1 && id <= 7;
    if (group === 'stripes') return id >= 9 && id <= 15;
    return false;
  }

  isPlayerOnEightBall(player) {
    const group = this.playerGroups[player];
    if (!group) return false;
    const remaining = this.turnManager.remainingBallsForGroup(group);
    return remaining === 0;
  }

  assignGroups(player, pocketedIds) {
    const firstLegal = pocketedIds.find(id => id !== 8);
    if (firstLegal === undefined) return;
    const group = firstLegal <= 7 ? 'solids' : 'stripes';
    this.playerGroups[player] = group;
    this.playerGroups[this.turnManager.otherPlayer(player)] = group === 'solids' ? 'stripes' : 'solids';
    this.groupsAssigned = true;
    this.eventBus.emit('groups:assigned', { ...this.playerGroups });
  }
}