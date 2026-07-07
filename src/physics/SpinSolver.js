import * as THREE from 'three';

export class SpinSolver {
  constructor(config = {}) {
    this.magnusCoefficient = config.magnusCoefficient ?? 0.00042;
    this.spinToRollTransitionSpeed = config.spinToRollTransitionSpeed ?? 0.02;
  }

  computeStrikeImpulse(tipOffset, cueDirection, power, ballRadius) {
    const maxOffset = ballRadius * 0.9;
    const localX = tipOffset.x * maxOffset;
    const localY = tipOffset.y * maxOffset;

    const forward = cueDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    const linearImpulse = forward.clone().multiplyScalar(power);
    const contactPoint = right.clone().multiplyScalar(localX).add(up.clone().multiplyScalar(localY));
    const forceVec = forward.clone().multiplyScalar(power);
    const angularImpulse = new THREE.Vector3().crossVectors(contactPoint, forceVec);

    const offsetMagnitude = Math.sqrt(tipOffset.x ** 2 + tipOffset.y ** 2);
    return { linearImpulse, angularImpulse, miscueRisk: offsetMagnitude > 0.85, contactPoint };
  }

  applySpinDynamics(ballBody, deltaTime) {
    const v = ballBody.velocity;
    const w = ballBody.angularVelocity;
    if (v.length() < 0.001) return;

    const magnus = new THREE.Vector3().crossVectors(w, v).multiplyScalar(this.magnusCoefficient);
    ballBody.applyForce(magnus);

    const contactVelocity = v.clone().add(new THREE.Vector3().crossVectors(w, new THREE.Vector3(0, -ballBody.radius, 0)));
    if (contactVelocity.length() > this.spinToRollTransitionSpeed) {
      const frictionDir = contactVelocity.clone().normalize().multiplyScalar(-1);
      const frictionForce = frictionDir.multiplyScalar(0.18 * ballBody.mass * 9.81);
      ballBody.applyForce(frictionForce);
      ballBody.applyTorque(new THREE.Vector3(0, -ballBody.radius, 0).cross(frictionForce));
    }
  }

  applyThrowEffect(rigidBodyA, rigidBodyB, contactNormal) {
    const tangentSpin = rigidBodyA.angularVelocity.clone().projectOnPlane(contactNormal);
    if (tangentSpin.length() < 0.1) return;
    const throwImpulse = tangentSpin.clone().cross(contactNormal).multiplyScalar(0.008);
    rigidBodyB.applyCentralImpulse(throwImpulse);
  }
}