import * as THREE from 'three';
import { MATERIALS } from './PhysicsMaterials.js';

/**
 * حل تصادم كرة-كرة: التصحيح الموضعي (فصل الكرتين) يُطبَّق دائماً
 * إذا كان في تداخل فعلي — بغض النظر عن اتجاه حركتهما.
 * أما دفعة الاصطدام (impulse) فتُطبَّق فقط إذا كانتا تقتربان من بعض.
 * ⭐ هذا الفصل هو ما يمنع "الالتصاق": حتى لو الكرتان مستقرتان بجانب بعض
 * بدون حركة تقارب، بيضل في تصحيح موضعي يفصلهما، لكن بدون قوة زايدة عليهما.
 */
export function resolveBallBallCollision(bodyA, bodyB, spinSolver) {
  const normal = new THREE.Vector3().subVectors(bodyB.position, bodyA.position);
  const dist = normal.length();
  if (dist < 1e-6) { normal.set(1, 0, 0); } else { normal.divideScalar(dist); }

  const overlap = (bodyA.radius + bodyB.radius) - dist;
  if (overlap > 0) {
    const totalInv = (bodyA.invMass + bodyB.invMass) || 1;
    bodyA.position.addScaledVector(normal, -overlap * (bodyA.invMass / totalInv));
    bodyB.position.addScaledVector(normal, overlap * (bodyB.invMass / totalInv));
  }

  const relVel = new THREE.Vector3().subVectors(bodyA.velocity, bodyB.velocity);
  const vRelAlongNormal = relVel.dot(normal);
  if (vRelAlongNormal <= 0) return null; // لا حاجة لدفعة اصطدام، فقط الفصل الموضعي كافٍ

  const e = MATERIALS.BALL.restitution;
  const invMassSum = bodyA.invMass + bodyB.invMass;
  const j = -(1 + e) * vRelAlongNormal / invMassSum;

  const impulse = normal.clone().multiplyScalar(j);
  bodyA.velocity.addScaledVector(impulse, bodyA.invMass);
  bodyB.velocity.addScaledVector(impulse, -bodyB.invMass);

  if (spinSolver) spinSolver.applyThrowEffect(bodyA, bodyB, normal);

  return { normal, impactSpeed: Math.abs(vRelAlongNormal) };
}

/**
 * ارتداد عن حافة ثابتة — الآن بمعامل `overlap` اختياري:
 * إذا الكرة متداخلة فعلياً مع الحافة، تُدفَع للخارج فوراً (overlap > 0)،
 * وبعدها تُعدَّل سرعتها فقط إذا كانت متجهة فعلياً نحو الحافة (وليس مبتعدة عنها).
 * ⭐ هذا يحل مشكلة الاختراق: الآن أي تداخل (حتى لو فات الكشف المستمر عليه) يُصحَّح فوراً.
 */
export function resolveBallCushionCollision(body, normal, overlap = 0) {
  if (overlap > 0) {
    body.position.addScaledVector(normal, overlap);
  }

  const v = body.velocity;
  const vAlongNormal = v.dot(normal);
  if (vAlongNormal >= 0) return { impactSpeed: 0 }; // أصلاً مبتعدة عن الحافة

  const m = MATERIALS.CUSHION;
  const w = body.angularVelocity;

  const vn = normal.clone().multiplyScalar(vAlongNormal);
  const vt = v.clone().sub(vn);
  const vnReflected = vn.clone().multiplyScalar(-m.restitution);

  const surfaceSpinVelocity = new THREE.Vector3().crossVectors(w, normal).multiplyScalar(body.radius);
  const vtAdjusted = vt.clone()
    .add(surfaceSpinVelocity.multiplyScalar(m.friction))
    .multiplyScalar(1 - m.friction * 0.3);

  body.velocity.copy(vnReflected.add(vtAdjusted));

  const spinTransfer = normal.clone().multiplyScalar(-w.dot(normal) * 0.4);
  body.angularVelocity.add(spinTransfer);

  return { impactSpeed: Math.abs(vAlongNormal) };
}