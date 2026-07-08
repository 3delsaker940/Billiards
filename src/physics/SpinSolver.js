import * as THREE from "three";

export class SpinSolver {
  constructor(config = {}) {
    this.magnusCoefficient = config.magnusCoefficient ?? 0.00042;
  }

  computeStrikeImpulse(tipOffset, cueDirection, power, ballRadius) {
    const maxOffset = ballRadius * 0.9;
    const localX = tipOffset.x * maxOffset;
    const localY = tipOffset.y * maxOffset;

    const forward = cueDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    const linearImpulse = forward.clone().multiplyScalar(power);
    const contactPoint = right
      .clone()
      .multiplyScalar(localX)
      .add(up.clone().multiplyScalar(localY));

    const angularImpulse = new THREE.Vector3().crossVectors(
      contactPoint,
      linearImpulse,
    );

    const offsetMagnitude = Math.sqrt(tipOffset.x ** 2 + tipOffset.y ** 2);
    return {
      linearImpulse,
      angularImpulse,
      miscueRisk: offsetMagnitude > 0.85,
      contactPoint,
    };
  }

  applySpinDynamics(ballBody) {
    const v = ballBody.velocity;
    const w = ballBody.angularVelocity;
    if (v.length() < 0.001) return;

    const magnus = new THREE.Vector3()
      .crossVectors(w, v)
      .multiplyScalar(this.magnusCoefficient);
    ballBody.applyForce(magnus);
  }

  applyThrowEffect(rigidBodyA, rigidBodyB, contactNormal, j) {
    if (j <= 0) return;

    const tangentSpin = rigidBodyA.angularVelocity
      .clone()
      .projectOnPlane(contactNormal);
    if (tangentSpin.length() < 0.1) return;

    const throwDir = tangentSpin.clone().cross(contactNormal).normalize();

    const ballToBallFriction = 0.06;

    const maxThrowImpulse = j * ballToBallFriction;

    const throwMagnitude = Math.min(
      tangentSpin.length() * 0.0005 * j,
      maxThrowImpulse,
    );
    const throwImpulse = throwDir.multiplyScalar(throwMagnitude);

    rigidBodyB.applyCentralImpulse(throwImpulse);
    rigidBodyA.applyCentralImpulse(throwImpulse.clone().negate());

    const rA = contactNormal.clone().multiplyScalar(rigidBodyA.radius);
    const torqueA = rA.cross(throwImpulse);
    rigidBodyA.angularVelocity.addScaledVector(torqueA, -rigidBodyA.invInertia);
  }
}
