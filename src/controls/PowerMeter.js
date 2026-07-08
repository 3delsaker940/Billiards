export class PowerMeter {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.minPower = config.minPower ?? 0.5;
    this.maxPower = config.maxPower ?? 12;

    this.cycleDuration = config.cycleDuration ?? 2.4;

    this.charging = false;
    this.currentPower = 0;
    this.elapsed = 0;
  }

  startCharging() {
    this.charging = true;
    this.elapsed = 0;
    this.currentPower = 0;
    this.eventBus.emit("power:start");
  }

  update(deltaTime) {
    if (!this.charging) return;
    this.elapsed += deltaTime;

    const t = this.elapsed / this.cycleDuration;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    this.currentPower = (Math.sin(angle) + 1) / 2;

    this.eventBus.emit("power:update", { normalized: this.currentPower });
  }

  release() {
    if (!this.charging) return null;
    this.charging = false;

    const impulseMagnitude =
      this.minPower + this.currentPower * (this.maxPower - this.minPower);
    this.eventBus.emit("power:release", {
      impulseMagnitude,
      normalized: this.currentPower,
    });
    return impulseMagnitude;
  }

  cancel() {
    this.charging = false;
    this.currentPower = 0;
    this.elapsed = 0;
    this.eventBus.emit("power:cancel");
  }
}
