import * as THREE from 'three';
import {
  sweptSphereSphereTime,
  sweptSphereSegmentTime,
  closestPointOnSegment,
} from './CollisionDetection.js';
import { resolveBallBallCollision, resolveBallCushionCollision } from './CollisionResponse.js';

export class PhysicsWorld {
  constructor(config = {}) {
    this.bodies = [];
    this.cushionSegments = [];
    this.substeps = config.substeps ?? 8;
    this.maxCollisionPassesPerSubstep = 12;
    this.spinSolver = null;
    this.contactEvents = [];
  }

  addBody(ballBody) { this.bodies.push(ballBody); }
  addCushionSegment(a, b) { this.cushionSegments.push({ a: a.clone(), b: b.clone() }); }
  setSpinSolver(spinSolver) { this.spinSolver = spinSolver; }

  step(deltaSeconds) {
    this.contactEvents = [];
    const clamped = Math.min(deltaSeconds, 1 / 30);
    const dt = clamped / this.substeps;
    for (let i = 0; i < this.substeps; i++) this._substep(dt);
  }

  _substep(dt) {
    const activeBalls = this.bodies.filter((b) => !b.isPocketed && !b.rigidBody.isFalling);

    // 1) القوى المتراكمة -> سرعات (F = m·a)
    activeBalls.forEach((b) => {
      const rb = b.rigidBody;
      rb.velocity.addScaledVector(rb.forceAccum, rb.invMass * dt);
      rb.angularVelocity.addScaledVector(rb.torqueAccum, rb.invInertia * dt);
    });

    // 2) ⭐ حل أي تداخل فعلي حالي — منفصل تماماً عن التنبؤ بالتصادم المستقبلي.
    //    هذا يحل مشكلتي "الالتصاق" و"اختراق الحواف" معاً.
    this._resolveOverlaps(activeBalls);

    // 3) الحركة المستمرة (Continuous Collision Detection) لالتقاط أي تصادم مستقبلي ضمن هذه الخطوة
    let remaining = dt;
    let passes = 0;
    while (remaining > 1e-9 && passes < this.maxCollisionPassesPerSubstep) {
      passes++;
      const earliest = this._findEarliestEvent(activeBalls, remaining);

      if (!earliest) {
        activeBalls.forEach((b) => b.rigidBody.position.addScaledVector(b.rigidBody.velocity, remaining));
        remaining = 0;
        break;
      }

      activeBalls.forEach((b) => b.rigidBody.position.addScaledVector(b.rigidBody.velocity, earliest.t));
      remaining -= earliest.t;
      this._resolveEvent(earliest);
    }

    // ⭐ إذا استُنفدت المحاولات المسموحة، لازم نكمل الحركة المتبقية بدل ما "تتجمد" الكرة
    if (remaining > 1e-9) {
      activeBalls.forEach((b) => b.rigidBody.position.addScaledVector(b.rigidBody.velocity, remaining));
    }

    // 4) تحديث الدوران البصري + تثبيت الكرة على مستوى الطاولة
    activeBalls.forEach((b) => {
      const rb = b.rigidBody;
      const angSpeed = rb.angularVelocity.length();
      if (angSpeed > 1e-8) {
        const axis = rb.angularVelocity.clone().divideScalar(angSpeed);
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, angSpeed * dt);
        rb.orientation.premultiply(dq).normalize();
      }
      rb.position.y = rb.radius;
      rb.velocity.y = 0;
    });

    activeBalls.forEach((b) => b.rigidBody.clearAccumulators());
  }

  /** يصحح أي تداخل فعلي حالياً بين الكرات، وبين الكرات والحواف */
  _resolveOverlaps(balls) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const A = balls[i].rigidBody;
        const B = balls[j].rigidBody;
        const dist = A.position.distanceTo(B.position);
        if (dist < A.radius + B.radius) {
          const result = resolveBallBallCollision(A, B, this.spinSolver);
          if (result) {
            this.contactEvents.push({ idA: balls[i].id, idB: balls[j].id, type: 'BALL_BALL', impactVelocity: result.impactSpeed });
          }
        }
      }
    }

    for (const ball of balls) {
      const rb = ball.rigidBody;
      for (const seg of this.cushionSegments) {
        const closest = closestPointOnSegment(rb.position, seg.a, seg.b);
        // ⭐ مسافة أفقية فقط (x,z) — تجاهل فرق الارتفاع الوهمي
        const delta = new THREE.Vector3(rb.position.x - closest.x, 0, rb.position.z - closest.z);
        const dist = delta.length();
        if (dist < rb.radius) {
          const normal = dist > 1e-6 ? delta.clone().normalize() : new THREE.Vector3(1, 0, 0);
          const overlap = rb.radius - dist;
          const result = resolveBallCushionCollision(rb, normal, overlap);
          if (result.impactSpeed > 0) {
            this.contactEvents.push({ idA: ball.id, idB: -1, type: 'BALL_CUSHION', impactVelocity: result.impactSpeed });
          }
        }
      }
    }
  }

  _findEarliestEvent(balls, maxT) {
    let best = null;

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const A = balls[i], B = balls[j];
        const t = sweptSphereSphereTime(A.position, A.velocity, A.radius, B.position, B.velocity, B.radius, maxT);
        if (t !== null && (!best || t < best.t)) best = { type: 'BALL_BALL', t, a: A, b: B };
      }
    }

    for (const ball of balls) {
      for (const seg of this.cushionSegments) {
        const t = sweptSphereSegmentTime(ball.position, ball.velocity, ball.radius, seg.a, seg.b, maxT);
        if (t !== null && (!best || t < best.t)) {
          best = { type: 'BALL_CUSHION', t, ball, seg };
        }
      }
    }
    return best;
  }

  _resolveEvent(event) {
    if (event.type === 'BALL_BALL') {
      const result = resolveBallBallCollision(event.a.rigidBody, event.b.rigidBody, this.spinSolver);
      if (result) {
        this.contactEvents.push({ idA: event.a.id, idB: event.b.id, type: 'BALL_BALL', impactVelocity: result.impactSpeed });
      }
    } else if (event.type === 'BALL_CUSHION') {
      const seg = event.seg;
      const closest = closestPointOnSegment(event.ball.position, seg.a, seg.b);
      const normal = new THREE.Vector3(
        event.ball.position.x - closest.x, 0, event.ball.position.z - closest.z
      ).normalize();
      const result = resolveBallCushionCollision(event.ball.rigidBody, normal, 0);
      if (result.impactSpeed > 0) {
        this.contactEvents.push({ idA: event.ball.id, idB: -1, type: 'BALL_CUSHION', impactVelocity: result.impactSpeed });
      }
    }
  }
}








