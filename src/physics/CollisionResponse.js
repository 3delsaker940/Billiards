import * as THREE from "three";
import { MATERIALS } from "./PhysicsMaterials.js";

export function resolveBallBallCollision(bodyA, bodyB, spinSolver) {
  const normal = new THREE.Vector3().subVectors(bodyB.position, bodyA.position);
  const dist = normal.length();
  if (dist < 1e-6) {
    normal.set(1, 0, 0);
  } else {
    normal.divideScalar(dist);
  }

  const overlap = bodyA.radius + bodyB.radius - dist;
  if (overlap > 0) {
    const totalInv = bodyA.invMass + bodyB.invMass || 1;
    bodyA.position.addScaledVector(
      normal,
      -overlap * (bodyA.invMass / totalInv),
    );
    bodyB.position.addScaledVector(
      normal,
      overlap * (bodyB.invMass / totalInv),
    );
  }

  const relVel = new THREE.Vector3().subVectors(bodyA.velocity, bodyB.velocity);
  const vRelAlongNormal = relVel.dot(normal);
  if (vRelAlongNormal <= 0) return null;

  const e = MATERIALS.BALL.restitution;
  const invMassSum = bodyA.invMass + bodyB.invMass;
  const j = (-(1 + e) * vRelAlongNormal) / invMassSum;

  const impulse = normal.clone().multiplyScalar(j);
  bodyA.velocity.addScaledVector(impulse, bodyA.invMass);
  bodyB.velocity.addScaledVector(impulse, -bodyB.invMass);

  if (spinSolver) spinSolver.applyThrowEffect(bodyA, bodyB, normal, j);

  return { normal, impactSpeed: Math.abs(vRelAlongNormal) };
}

export function resolveBallCushionCollision(body, normal, overlap = 0) {
  if (overlap > 0) {
    body.position.addScaledVector(normal, overlap);
  }

  const v = body.velocity;
  const w = body.angularVelocity;
  const vAlongNormal = v.dot(normal);

  if (vAlongNormal >= 0) return { impactSpeed: 0 };

  const m = MATERIALS.CUSHION;
  const e = m.restitution;
  const jNormal = -(1 + e) * vAlongNormal * body.mass;
  const normalImpulse = normal.clone().multiplyScalar(jNormal);

  const rVec = normal.clone().multiplyScalar(-body.radius);
  const surfaceVelocity = v.clone().add(w.clone().cross(rVec));
  const vTangent = surfaceVelocity
    .clone()
    .sub(normal.clone().multiplyScalar(surfaceVelocity.dot(normal)));
  const slipSpeed = vTangent.length();

  let tangentImpulse = new THREE.Vector3();

  if (slipSpeed > 0.001) {
    const tangentDir = vTangent.clone().normalize().multiplyScalar(-1);

    const effectiveMassTangent = (2 / 7) * body.mass;

    const requiredFriction = slipSpeed * effectiveMassTangent;

    const maxFriction = jNormal * m.friction;

    const actualFriction = Math.min(requiredFriction, maxFriction);
    tangentImpulse = tangentDir.multiplyScalar(actualFriction);
  }

  const totalImpulse = normalImpulse.clone().add(tangentImpulse);

  body.velocity.addScaledVector(totalImpulse, body.invMass);
  const torqueImpulse = rVec.clone().cross(totalImpulse);
  body.angularVelocity.addScaledVector(torqueImpulse, body.invInertia);

  body.angularVelocity.y *= 1 - m.friction * 0.4;

  return { impactSpeed: Math.abs(vAlongNormal) };
}
