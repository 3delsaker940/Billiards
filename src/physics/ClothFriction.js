import * as THREE from "three";

export class ClothFriction {
  constructor(config = {}) {
    this.slidingFrictionCoeff = config.slidingFrictionCoeff ?? 0.25;
    this.rollingFrictionCoeff = config.rollingFrictionCoeff ?? 0.018;
    this.spinningFrictionCoeff = config.spinningFrictionCoeff ?? 0.044;
    this.spinDampingThreshold = 1e-4;
    this.gravity = 9.81;
    this.slipThreshold = 0.015;
  }
  apply(ballBody) {
    const v = ballBody.velocity;
    const w = ballBody.angularVelocity;
    const speed = v.length();
    const spinSpeed = w.length();

    if (speed < 0.001 && spinSpeed < 0.001) return;

    const r = new THREE.Vector3(0, -ballBody.radius, 0);
    const surfaceVel = v.clone().add(w.clone().cross(r));
    const slip = surfaceVel.length();

    if (slip > this.slipThreshold) {
      const frictionDir = surfaceVel.clone().normalize().multiplyScalar(-1);
      const force = frictionDir.multiplyScalar(
        this.slidingFrictionCoeff * ballBody.mass * this.gravity,
      );

      ballBody.applyForce(force);
      ballBody.applyTorque(r.clone().cross(force));
    } else if (speed > 0.001) {
      const activeRollingCoeff = Math.max(this.rollingFrictionCoeff, 0.015);

      const rollForceMag = activeRollingCoeff * ballBody.mass * this.gravity;
      const forceDir = v.clone().normalize().multiplyScalar(-1);
      ballBody.applyForce(forceDir.multiplyScalar(rollForceMag));

      const rollingTorqueMag =
        activeRollingCoeff * ballBody.mass * this.gravity * ballBody.radius;
      const torqueDir = w.clone().normalize().multiplyScalar(-1);
      ballBody.applyTorque(torqueDir.multiplyScalar(rollingTorqueMag));
    }

    if (Math.abs(w.y) > this.spinDampingThreshold) {
      const spinFriction =
        this.spinningFrictionCoeff *
        ballBody.mass *
        this.gravity *
        ballBody.radius;
      const spinTorque = new THREE.Vector3(
        0,
        -Math.sign(w.y) * spinFriction,
        0,
      );
      ballBody.applyTorque(spinTorque);
    }
  }
}
