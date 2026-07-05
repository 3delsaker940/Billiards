import { MATERIALS } from './PhysicsMaterials.js';
import { AmmoUtils } from '../utils/AmmoUtils.js';

export class BallBody {
  constructor(physicsWorld, position, id) {
    const Ammo = physicsWorld.AmmoRef;
    const m = MATERIALS.BALL;

    const shape = new Ammo.btSphereShape(m.radius);
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

    const motionState = new Ammo.btDefaultMotionState(transform);
    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(m.mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      m.mass, motionState, shape, localInertia
    );

    // بعض نسخ Ammo بتوفر set_m_restitution/friction كدوال على rbInfo،
    // وبعضها لازم تنضبط بعد إنشاء الجسم مباشرة عبر setRestitution/setFriction.
    AmmoUtils.safeCall(rbInfo, 'set_m_restitution', m.restitution);
    AmmoUtils.safeCall(rbInfo, 'set_m_friction', m.friction);
    AmmoUtils.safeCall(rbInfo, 'set_m_rollingFriction', m.rollingFriction);

    this.body = new Ammo.btRigidBody(rbInfo);

    // احتياطي: إذا rbInfo ما قبلت الإعدادات فوق، نطبقها هون مباشرة على الجسم
    AmmoUtils.safeCall(this.body, 'setRestitution', m.restitution);
    AmmoUtils.safeCall(this.body, 'setFriction', m.friction);
    AmmoUtils.safeCall(this.body, 'setRollingFriction', m.rollingFriction);
    if (typeof this.body.setSpinningFriction === 'function') {
      this.body.setSpinningFriction(m.spinningFriction);
    }

    AmmoUtils.safeCall(this.body, 'setActivationState', 4); // DISABLE_DEACTIVATION

    // منع الاختراق بالسرعات العالية (CCD)
    AmmoUtils.safeCall(this.body, 'setCcdMotionThreshold', m.ccdMotionThreshold);
    AmmoUtils.safeCall(this.body, 'setCcdSweptSphereRadius', m.ccdSweptSphereRadius);

    AmmoUtils.safeCall(this.body, 'setDamping', m.linearDamping, m.angularDamping);

    // معرّف الكرة (0 = البيضاء، 1-15 = بقية الكرات) — مطلوب لتصنيف الاصطدامات لاحقاً
    AmmoUtils.safeCall(this.body, 'setUserIndex', id);
    this.id = id; // احتياطي: نحتفظ فيه بجافاسكريبت أيضاً لو setUserIndex مش مدعومة إطلاقاً

    physicsWorld.world.addRigidBody(this.body);
  }

  /** يرجّع معرف الكرة، سواء كان مخزّن بـ Ammo أو بجافاسكريبت (احتياطي) */
  getId() {
    if (typeof this.body.getUserIndex === 'function') {
      return this.body.getUserIndex();
    }
    return this.id;
  }

  isMoving(threshold = 0.005) {
    const v = this.body.getLinearVelocity();
    const w = this.body.getAngularVelocity();
    const speed = Math.sqrt(v.x()**2 + v.y()**2 + v.z()**2);
    const angSpeed = Math.sqrt(w.x()**2 + w.y()**2 + w.z()**2);
    return (speed > threshold || angSpeed > 0.05);
  }
}