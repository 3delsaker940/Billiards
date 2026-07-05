// physics/CollisionDispatcher.js
export class CollisionDispatcher {
  constructor(physicsWorld, eventBus) {
    this.world = physicsWorld.world;
    this.eventBus = eventBus;
    this.dispatcher = this.world.getDispatcher();
  }

  processCollisions() {
    const numManifolds = this.dispatcher.getNumManifolds();
    for (let i = 0; i < numManifolds; i++) {
      const manifold = this.dispatcher.getManifoldByIndexInternal(i);
      const numContacts = manifold.getNumContacts();
      if (numContacts === 0) continue;

      const bodyA = Ammo.castObject(manifold.getBody0(), Ammo.btRigidBody);
      const bodyB = Ammo.castObject(manifold.getBody1(), Ammo.btRigidBody);
      const contact = manifold.getContactPoint(0);
      const impactVelocity = contact.getAppliedImpulse();

      // استخدام getUserIndex بأمان — إذا غير مدعومة، القيمة الافتراضية -99 (غير معروف)
      const idA = typeof bodyA.getUserIndex === 'function' ? bodyA.getUserIndex() : -99;
      const idB = typeof bodyB.getUserIndex === 'function' ? bodyB.getUserIndex() : -99;

      this.eventBus.emit('physics:contact', {
        idA, idB, impactVelocity,
        type: this.classify(idA, idB),
        point: contact.get_m_positionWorldOnA(),
      });
    }
  }

  classify(idA, idB) {
    if (idA === -1 || idB === -1) return 'BALL_CUSHION';
    if (idA === -2 || idB === -2) return 'BALL_CUE';
    return 'BALL_BALL';
  }
}