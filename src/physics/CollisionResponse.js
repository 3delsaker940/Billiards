import * as THREE from 'three';
import { MATERIALS } from './PhysicsMaterials.js';

/**
 * حل تصادم كرة-كرة: التصحيح الموضعي (فصل الكرتين) يُطبَّق دائماً إذا كان في تداخل فعلي.
 * أما دفعة الاصطدام (impulse) فتُطبَّق فقط إذا كانتا تقتربان من بعض.
 */
export function resolveBallBallCollision(bodyA, bodyB, spinSolver) {
  const normal = new THREE.Vector3().subVectors(bodyB.position, bodyA.position);
  const dist = normal.length();
  if (dist < 1e-6) { normal.set(1, 0, 0); } else { normal.divideScalar(dist); }

  // 1) التصحيح الموضعي للفصل ومنع الالتصاق والارتجاف
  const overlap = (bodyA.radius + bodyB.radius) - dist;
  if (overlap > 0) {
    const totalInv = (bodyA.invMass + bodyB.invMass) || 1;
    bodyA.position.addScaledVector(normal, -overlap * (bodyA.invMass / totalInv));
    bodyB.position.addScaledVector(normal, overlap * (bodyB.invMass / totalInv));
  }

  const relVel = new THREE.Vector3().subVectors(bodyA.velocity, bodyB.velocity);
  const vRelAlongNormal = relVel.dot(normal);
  if (vRelAlongNormal <= 0) return null; // الكرات أصلاً تبتعد عن بعضها، لا داعي للدفعة الحركية

  // 2) الحساب الديناميكي لدفعة الاصطدام العمودية (j) بناءً على معامل الارتداد وقانون حفظ الزخم
  const e = MATERIALS.BALL.restitution;
  const invMassSum = bodyA.invMass + bodyB.invMass;
  const j = -(1 + e) * vRelAlongNormal / invMassSum;

  const impulse = normal.clone().multiplyScalar(j);
  bodyA.velocity.addScaledVector(impulse, bodyA.invMass);
  bodyB.velocity.addScaledVector(impulse, -bodyB.invMass);

  // ⭐ [تعديل أساسي]: مررنا قيمة j الحقيقية لحساب الـ Throw Effect بشكل متناسب فيزيائياً وكبح طاقة الدوران الانفجارية
  if (spinSolver) spinSolver.applyThrowEffect(bodyA, bodyB, normal, j);

  return { normal, impactSpeed: Math.abs(vRelAlongNormal) };
}

/**
 * ارتداد عن حافة ثابتة: يدمج التصحيح الموضعي الفوري للتداخل،
 * ويحسب الاحتكاك المماسي المؤثر على السرعة الخطية والسرعة الزاوية معاً (رد الفعل الدورانى).
 */
export function resolveBallCushionCollision(body, normal, overlap = 0) {
  if (overlap > 0) {
    body.position.addScaledVector(normal, overlap); // دفع الكرة خارج الحافة فوراً
  }

  const v = body.velocity;
  const w = body.angularVelocity;
  const vAlongNormal = v.dot(normal);

  if (vAlongNormal >= 0) return { impactSpeed: 0 }; // الكرة مبتعدة أصلاً

  const m = MATERIALS.CUSHION;

  // 1. حساب قوة الصدمة العمودية (Bounce)
  const e = m.restitution;
  const jNormal = -(1 + e) * vAlongNormal * body.mass;
  const normalImpulse = normal.clone().multiplyScalar(jNormal);

  // 2. حساب السرعة المماسية النسبية عند نقطة التلامس (Slip Velocity)
  const rVec = normal.clone().multiplyScalar(-body.radius);
  const surfaceVelocity = v.clone().add(w.clone().cross(rVec));
  const vTangent = surfaceVelocity.clone().sub(normal.clone().multiplyScalar(surfaceVelocity.dot(normal)));
  const slipSpeed = vTangent.length();

  let tangentImpulse = new THREE.Vector3();

  // 3. حساب وكبح قوة الاحتكاك المماسية (حل مشكلة التسارع الوهمي)
  if (slipSpeed > 0.001) {
    const tangentDir = vTangent.clone().normalize().multiplyScalar(-1);
    
    // الكتلة الفعالة المماسية للكرة المصمتة هي (2/7) من كتلتها (رياضيات نيوتن)
    const effectiveMassTangent = (2 / 7) * body.mass;
    
    // النبضة المطلوبة لإيقاف الانزلاق تماماً
    const requiredFriction = slipSpeed * effectiveMassTangent;
    
    // الحد الأقصى المسموح به فيزيائياً (قانون كولوم)
    const maxFriction = jNormal * m.friction; 
    
    // نأخذ القيمة الأقل حتى لا نعطي الكرة طاقة وهمية
    const actualFriction = Math.min(requiredFriction, maxFriction);
    tangentImpulse = tangentDir.multiplyScalar(actualFriction);
  }

  // 4. تطبيق القوى على الكرة
  const totalImpulse = normalImpulse.clone().add(tangentImpulse);
  
  // تحديث السرعة الخطية
  body.velocity.addScaledVector(totalImpulse, body.invMass);
  // تحديث السرعة الزاوية (رد الفعل الدورانى)
  const torqueImpulse = rVec.clone().cross(totalImpulse);
  body.angularVelocity.addScaledVector(torqueImpulse, body.invInertia);

  // تخميد إضافي للدوران العمودي (Y) لأن الحافة تضغط على الكرة
  body.angularVelocity.y *= (1 - m.friction * 0.4);

  return { impactSpeed: Math.abs(vAlongNormal) };
}