import * as THREE from "three";
import { createRenderer } from "./Renderer.js";

export class Engine {
  constructor(canvas) {
    this.renderer = createRenderer(canvas);
    this.clock = new THREE.Clock();
    this.updateCallbacks = [];
    this._running = false;
    this._maxDelta = 1 / 30;
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  start() {
    this._running = true;
    this.clock.start();
    this._loop();
  }

  stop() {
    this._running = false;
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    const delta = Math.min(this.clock.getDelta(), this._maxDelta);
    for (const cb of this.updateCallbacks) cb(delta);
  }
}
