// physics/CushionBody.js (relevant excerpt)
export class CushionCollisionHandler {
  /**
   * Standard reflection (angle in = angle out) is WRONG for spinning balls.
   * A ball with sidespin hitting a rail comes off at a measurably different
   * angle because the cushion's friction grips the spinning surface.
   */
  resolveCushionImpact(ballBody, cushionNormal, restitution = 0.85, cushionFriction = 0.25) {
    const v = AmmoUtils.toThree(ballBody.body.getLinearVelocity());
    const w = AmmoUtils.toThree(ballBody.body.getAngularVelocity());

    const vn = cushionNormal.clone().multiplyScalar(v.dot(cushionNormal));
    const vt = v.clone().sub(vn); // tangential component (along rail)

    // Reflect normal component with restitution
    const vnReflected = vn.clone().multiplyScalar(-restitution);

    // Tangential velocity is altered by rail friction AND surface spin
    // at the contact point (cushion grips the ball's equator).
    const surfaceSpinVelocity = new THREE.Vector3().crossVectors(w, cushionNormal)
      .multiplyScalar(0.02); // ball radius scale factor

    const vtAdjusted = vt.clone()
      .add(surfaceSpinVelocity.multiplyScalar(cushionFriction))
      .multiplyScalar(1 - cushionFriction * 0.3);

    const finalVelocity = vnReflected.add(vtAdjusted);
    ballBody.body.setLinearVelocity(AmmoUtils.toAmmo(finalVelocity));

    // Rail imparts a small amount of reverse spin (bites the ball) — 
    // this is what causes "squirt" off cushions on heavy english shots.
    const spinTransfer = cushionNormal.clone().multiplyScalar(-w.dot(cushionNormal) * 0.4);
    const newAngular = w.clone().add(spinTransfer);
    ballBody.body.setAngularVelocity(AmmoUtils.toAmmo(newAngular));
  }
}






/**
 * يبني شكل الكوشن المركّب (compound) بنفس فجوات الريلز المرئية بالضبط،
 * حتى تقدر الكرة تدخل فعلياً لمنطقة الجيب بدل ما ترتد عن جدار وهمي.
 */
export function buildCushionCompound(Ammo, layout, ballRadius) {
  const compound = new Ammo.btCompoundShape();
  const noseHeight = ballRadius * 0.635;
  const thickness = 0.02;

  layout.side.forEach((seg) => {
    const halfLen = seg.length / 2;
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(thickness, thickness, halfLen));
    const t = new Ammo.btTransform();
    t.setIdentity();
    t.setOrigin(new Ammo.btVector3(seg.x, noseHeight, seg.zCenter));
    compound.addChildShape(t, shape);
  });

  layout.end.forEach((seg) => {
    const halfLen = seg.length / 2;
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(halfLen, thickness, thickness));
    const t = new Ammo.btTransform();
    t.setIdentity();
    t.setOrigin(new Ammo.btVector3(seg.xCenter, noseHeight, seg.z));
    compound.addChildShape(t, shape);
  });

  return compound;
}