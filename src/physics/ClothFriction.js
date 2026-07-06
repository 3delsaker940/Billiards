import * as THREE from 'three';

export class ClothFriction {
  constructor(config = {}) {
    this.slidingFrictionCoeff = config.slidingFrictionCoeff ?? 0.18;
    this.rollingFrictionCoeff = config.rollingFrictionCoeff ?? 0.008;
    this.gravity = 9.81;
    this.slipThreshold = 0.015;
  }

  apply(ballBody) {
    const v = ballBody.velocity;
    const w = ballBody.angularVelocity;
    if (v.length() < 0.001 && w.length() < 0.001) return;

    const r = new THREE.Vector3(0, -ballBody.radius, 0);
    const contactVel = v.clone().add(w.clone().cross(r));
    const slip = contactVel.length();

    if (slip > this.slipThreshold) {
      const frictionDir = contactVel.clone().normalize().multiplyScalar(-1);
      const force = frictionDir.multiplyScalar(this.slidingFrictionCoeff * ballBody.mass * this.gravity);
      ballBody.applyForce(force);
      ballBody.applyTorque(r.clone().cross(force));
    } else if (v.length() > 0.001) {
      const rollingForce = v.clone().normalize().multiplyScalar(-this.rollingFrictionCoeff * ballBody.mass * this.gravity);
      ballBody.applyForce(rollingForce);
    }
  }
}