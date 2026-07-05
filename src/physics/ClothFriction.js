/**
 * Models the sliding -> rolling friction transition on the cloth bed.
 * Bullet's built-in rollingFriction handles steady-state rolling resistance,
 * but the REALISTIC transition (a struck ball skids before it "grips" and
 * starts true rolling) needs this extra per-frame correction, since Bullet's
 * primitive doesn't model the sliding phase's directional kinetic friction.
 */
export class ClothFriction {
  constructor(config = {}) {
    this.slidingFrictionCoeff = config.slidingFrictionCoeff ?? 0.18;
    this.rollingFrictionCoeff = config.rollingFrictionCoeff ?? 0.008;
    this.gravity = 9.81;
    this.ballRadius = 0.028575;
    this.ballMass = 0.170;
    this.slipThreshold = 0.015; // m/s — below this, treat as "rolling", not "sliding"
  }

  /** Call once per physics substep for every active (non-pocketed) ball. */
  apply(ballBody, AmmoUtils, ThreeVec3) {
    const v = AmmoUtils.toThree(ballBody.body.getLinearVelocity());
    const w = AmmoUtils.toThree(ballBody.body.getAngularVelocity());
    if (v.length() < 0.001 && w.length() < 0.001) return;

    // Velocity of the contact point on the ball's surface touching the cloth:
    // v_contact = v + ω × (-r*up)
    const r = new ThreeVec3(0, -this.ballRadius, 0);
    const contactVel = v.clone().add(w.clone().cross(r));
    const slip = contactVel.length();

    if (slip > this.slipThreshold) {
      // SLIDING PHASE: kinetic friction opposes the contact-point slip direction,
      // decelerating linear velocity while simultaneously building up "true roll" spin.
      const frictionDir = contactVel.clone().normalize().multiplyScalar(-1);
      const frictionForceMag = this.slidingFrictionCoeff * this.ballMass * this.gravity;
      const force = frictionDir.multiplyScalar(frictionForceMag);
      ballBody.body.applyCentralForce(AmmoUtils.toAmmo(force));

      const torque = r.clone().cross(force);
      ballBody.body.applyTorque(AmmoUtils.toAmmo(torque));
    } else {
      // ROLLING PHASE: only weak rolling resistance remains (cloth nap drag).
      if (v.length() > 0.001) {
        const rollingForce = v.clone().normalize()
          .multiplyScalar(-this.rollingFrictionCoeff * this.ballMass * this.gravity);
        ballBody.body.applyCentralForce(AmmoUtils.toAmmo(rollingForce));
      }
    }
  }
}