import * as THREE from 'three';


export class RigidBody {
  constructor({ position, radius, mass, isStatic = false }) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
    this.orientation = new THREE.Quaternion();

    this.radius = radius;
    this.mass = mass;
    this.isStatic = isStatic;
    this.invMass = (isStatic || mass <= 0) ? 0 : 1 / mass;

    // عزم القصور الذاتي لكرة مصمتة متجانسة: I = (2/5) * m * r²  (معادلة فيزياء قياسية)
    this.inertia = 0.4 * mass * radius * radius;
    this.invInertia = (isStatic || this.inertia <= 0) ? 0 : 1 / this.inertia;

    this.forceAccum = new THREE.Vector3();
    this.torqueAccum = new THREE.Vector3();
    this.isFalling = false; // حالة انتقالية أثناء السقوط داخل الجيب
  }

  applyForce(force) { this.forceAccum.add(force); }
  applyTorque(torque) { this.torqueAccum.add(torque); }
  applyCentralImpulse(impulse) { this.velocity.addScaledVector(impulse, this.invMass); }
  applyTorqueImpulse(impulse) { this.angularVelocity.addScaledVector(impulse, this.invInertia); }

  clearAccumulators() {
    this.forceAccum.set(0, 0, 0);
    this.torqueAccum.set(0, 0, 0);
  }

  isMoving(threshold = 0.004) {
    return this.velocity.length() > threshold || this.angularVelocity.length() > 0.06;
  }
}