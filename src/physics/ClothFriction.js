import * as THREE from 'three';

export class ClothFriction {
  constructor(config = {}) {
    this.slidingFrictionCoeff = config.slidingFrictionCoeff ?? 0.25;
    this.rollingFrictionCoeff = config.rollingFrictionCoeff ?? 0.018;
    // احتكاك دوراني (pivot/spinning friction) جديد — يخمّد الدوران حول y فقط
    this.spinningFrictionCoeff = config.spinningFrictionCoeff ?? 0.044;
    this.spinDampingThreshold = 1e-4;
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
  } else if (w.length() > this.spinDampingThreshold) {
    // ⭐ ولا شرط من الاتنين فوق تحقق: الكرة تقريباً واقفة خطياً (v≈0)
    // وبواقي الدوران صغير كفاية إنه ما ولّد slip كافي. هاي أعم حالة من دوران y
    // فقط — بتشمل كمان بواقي topspin/backspin صغيرة بعد توقف الحركة الخطية.
    const torqueMag = this.spinningFrictionCoeff * ballBody.mass * this.gravity * ballBody.radius;
    const spinDampingTorque = w.clone().normalize().multiplyScalar(-torqueMag);
    ballBody.applyTorque(spinDampingTorque);
  }
}
}