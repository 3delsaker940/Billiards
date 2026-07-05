// controls/PowerMeter.js
export class PowerMeter {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.minPower = config.minPower ?? 0.5;
    this.maxPower = config.maxPower ?? 12;   // impulse magnitude cap (Newton-seconds)
    this.chargeRate = config.chargeRate ?? 8; // units per second
    this.charging = false;
    this.currentPower = 0;
    this.direction = 1; // oscillates 0->1->0 for hold-to-shoot style
  }

  startCharging() {
    this.charging = true;
    this.currentPower = 0;
    this.eventBus.emit('power:start');
  }

  update(deltaTime) {
    if (!this.charging) return;
    this.currentPower += this.chargeRate * this.direction * deltaTime;
    if (this.currentPower >= 1) { this.currentPower = 1; this.direction = -1; }
    if (this.currentPower <= 0) { this.currentPower = 0; this.direction = 1; }
    this.eventBus.emit('power:update', { normalized: this.currentPower });
  }

  /** Player releases to shoot */
  release() {
    if (!this.charging) return null;
    this.charging = false;
    const impulseMagnitude = this.minPower + this.currentPower * (this.maxPower - this.minPower);
    this.eventBus.emit('power:release', { impulseMagnitude });
    return impulseMagnitude;
  }

  /** Player right-clicks / hits ESC to abort without shooting */
  cancel() {
    this.charging = false;
    this.currentPower = 0;
    this.eventBus.emit('power:cancel');
  }
}