// physics/SpinSolver.js
import * as THREE from 'three';
import { AmmoUtils } from '../utils/AmmoUtils.js';

/**
 * Handles cue-strike impulse decomposition and post-collision spin transfer.
 * Spin state is tracked as an explicit angular velocity vector on the Ammo body,
 * but we layer additional "surface friction coupling" logic on top because
 * pure rigid-body angular velocity alone won't curve a ball's path realistically
 * (that requires simulating the contact-patch friction against the cloth).
 */
export class SpinSolver {
  constructor(config = {}) {
    this.magnusCoefficient = config.magnusCoefficient ?? 0.00042;
    this.spinToRollTransitionSpeed = config.spinToRollTransitionSpeed ?? 0.02;
  }

  /**
   * Converts a 2D cue-tip strike position (on the cueball's visible disc, in UI space
   * from -1..1 on X/Y) plus cue power into a physically-decomposed impulse:
   * - Center strike  -> pure forward roll (no spin)
   * - Above center    -> topspin (overspin, forward-rolling faster than natural roll)
   * - Below center    -> backspin (draw)
   * - Left/right of center -> sidespin (English)
   */
  computeStrikeImpulse(tipOffset, cueDirection, power, ballRadius) {
    // tipOffset: {x, y} in range [-1, 1], (0,0) = dead center
    const maxOffset = ballRadius * 0.9; // physically, cue can't strike past ~90% of radius (miscue zone)
    const localX = tipOffset.x * maxOffset; // side (English)
    const localY = tipOffset.y * maxOffset; // vertical (top/back spin)

    const forward = cueDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    // Linear impulse is always along cue direction, magnitude from power slider.
    const linearImpulse = forward.clone().multiplyScalar(power);

    // Torque impulse arm = offset vector from ball center to contact point.
    const contactPoint = right.clone().multiplyScalar(localX)
      .add(up.clone().multiplyScalar(localY));

    // Angular impulse = r × F  (this naturally produces top/back/side spin
    // from a SINGLE unified formula rather than special-casing each spin type)
    const forceVec = forward.clone().multiplyScalar(power);
    const angularImpulse = new THREE.Vector3().crossVectors(contactPoint, forceVec);

    // Miscue check: strikes too far from center have a chance to slip (skill-based, not RNG-cheated)
    const offsetMagnitude = Math.sqrt(tipOffset.x ** 2 + tipOffset.y ** 2);
    const miscueRisk = offsetMagnitude > 0.85;

    return { linearImpulse, angularImpulse, miscueRisk, contactPoint };
  }

  /**
   * Called every physics substep for the cue ball only (spin decay + curve).
   * Applies a Magnus-like sideways force proportional to spin × velocity,
   * and gradually converts sliding friction into rolling friction as spin
   * and translational velocity converge (the real "spin takes hold" moment).
   */
  applySpinDynamics(ballBody, deltaTime) {
    const v = AmmoUtils.toThree(ballBody.body.getLinearVelocity());
    const w = AmmoUtils.toThree(ballBody.body.getAngularVelocity());

    if (v.length() < 0.001) return;

    // Magnus force: F = k * (ω × v). This curves the path of a ball hit with
    // side/top/back spin while still sliding (before pure rolling begins).
    const magnus = new THREE.Vector3().crossVectors(w, v)
      .multiplyScalar(this.magnusCoefficient);

    const currentForce = new (ballBody.body.getTotalForce().constructor)();
    ballBody.body.applyCentralForce(AmmoUtils.toAmmo(magnus));

    // Sliding -> rolling transition: compute contact-point velocity
    // (velocity of the ball's surface point touching the cloth).
    const ballRadius = 0.028575;
    const contactVelocity = v.clone().add(
      new THREE.Vector3().crossVectors(w, new THREE.Vector3(0, -ballRadius, 0))
    );

    if (contactVelocity.length() > this.spinToRollTransitionSpeed) {
      // Still sliding: apply kinetic friction opposing contact-point slip.
      // This is what makes backspin balls travel forward, stop, then roll BACK.
      const frictionDir = contactVelocity.clone().normalize().multiplyScalar(-1);
      const frictionForce = frictionDir.multiplyScalar(0.18 * 0.170 * 9.81); // μ*m*g
      ballBody.body.applyCentralForce(AmmoUtils.toAmmo(frictionForce));

      // Friction also modifies spin (torque = r × F at contact patch)
      const torque = new THREE.Vector3().crossVectors(
        new THREE.Vector3(0, -ballRadius, 0), frictionForce
      );
      ballBody.body.applyTorque(AmmoUtils.toAmmo(torque));
    }
    // Once contactVelocity ~ 0, ball is in "natural roll" — no further sliding friction needed.
  }

  /**
   * Applies sidespin's effect on the OTHER ball at moment of ball-to-ball collision.
   * A ball with heavy sidespin imparts a small deflection ("throw") onto the object ball.
   * Call this from CollisionDispatcher when contact type === BALL_BALL.
   */
  applyThrowEffect(cueBall, objectBallBody, contactNormal) {
    const w = AmmoUtils.toThree(cueBall.body.getAngularVelocity());
    const tangentSpin = w.clone().projectOnPlane(contactNormal);
    if (tangentSpin.length() < 0.1) return;

    const throwImpulse = tangentSpin.clone()
      .cross(contactNormal)
      .multiplyScalar(0.008); // empirical throw coefficient

    objectBallBody.body.applyCentralImpulse(AmmoUtils.toAmmo(throwImpulse));
  }
}