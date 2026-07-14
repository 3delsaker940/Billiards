import * as THREE from "three";
import { IMPACT_SOUNDS } from "./ImpactSoundMap.js";

export class AudioManager {
  constructor(camera, eventBus) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.buffers = new Map();
    this.pool = [];
    this.poolSize = 24;

    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(new THREE.PositionalAudio(this.listener));
    }
    this.nextFree = 0;

    eventBus.on("physics:contact", (e) => this.onImpact(e));
  }

  async preload(loader) {
    for (const [type, cfg] of Object.entries(IMPACT_SOUNDS)) {
      for (const file of cfg.samples) {
        const buffer = await loader.loadAudio(`assets/audio/${file}`);
        this.buffers.set(file, buffer);
      }
    }
  }

  onImpact({ type, impactVelocity, worldPosition }) {
    const cfg = IMPACT_SOUNDS[type];
    if (!cfg) return;
    if (impactVelocity < cfg.minVel * 0.05) return;

    const sample = cfg.samples[Math.floor(Math.random() * cfg.samples.length)];
    const buffer = this.buffers.get(sample);
    if (!buffer) return;

    const audio = this.pool[this.nextFree];
    this.nextFree = (this.nextFree + 1) % this.poolSize;
    if (audio.isPlaying) audio.stop();

    const normalizedVel = THREE.MathUtils.clamp(
      (impactVelocity - cfg.minVel) / (cfg.maxVel - cfg.minVel),
      0,
      1,
    );
    audio.setBuffer(buffer);
    audio.setVolume(cfg.baseGain * (0.3 + normalizedVel * 0.7));
    audio.setPlaybackRate(0.95 + Math.random() * 0.1);
    if (worldPosition) audio.position.copy(worldPosition);
    audio.play();
  }
}
