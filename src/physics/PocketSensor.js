import * as THREE from "three";

export class PocketSensor {
  constructor(position, jawRadius = 0.075, dropRadius = 0.045) {
    this.position = new THREE.Vector3(position.x, 0, position.z);
    this.jawRadius = jawRadius;
    this.dropRadius = dropRadius;
    this.pullStrength = 1.4;
    this.restY = -0.12;
  }

  update(ballBody, deltaTime) {
    const p = ballBody.position;

    if (ballBody.rigidBody.isFalling) {
      ballBody.rigidBody.velocity.y -= 9.81 * deltaTime;
      p.addScaledVector(ballBody.velocity, deltaTime);
      if (p.y <= this.restY) return "SETTLED";
      return "FALLING";
    }

    const dx = p.x - this.position.x;
    const dz = p.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this.jawRadius) {
      const pull = this.pullStrength * (1 - dist / this.jawRadius);
      ballBody.velocity.x -= dx * pull * deltaTime * 10;
      ballBody.velocity.z -= dz * pull * deltaTime * 10;
    }

    if (dist < this.dropRadius) {
      ballBody.rigidBody.isFalling = true;
      ballBody.velocity.set(0, -0.3, 0);
      return "CAPTURED";
    }
    return null;
  }
}
