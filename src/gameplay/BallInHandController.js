// gameplay/BallInHandController.js
export class BallInHandController {
  constructor(cueBallBody, table, raycaster) {
    this.cueBallBody = cueBallBody;
    this.table = table;
    this.raycaster = raycaster;
    this.dragging = false;
  }

  onPointerMove(ndcPos, camera, otherBalls, restrictedToKitchen = false) {
    this.raycaster.setFromCamera(ndcPos, camera);
    const hit = this.raycaster.intersectObject(this.table.slateMesh)[0];
    if (!hit) return;

    let pos = hit.point;
    if (restrictedToKitchen && pos.z > this.table.headStringZ) {
      pos.z = this.table.headStringZ; // clamp to legal kitchen zone after opponent's break foul
    }

    const legal = this.validatePosition(pos, otherBalls);
    this.previewPosition = pos;
    this.isLegal = legal;
  }

  validatePosition(pos, otherBalls) {
    const r = 0.028575;
    for (const ball of otherBalls) {
      if (pos.distanceTo(ball.mesh.position) < r * 2.05) return false;
    }
    return this.table.isInsideBounds(pos, r);
  }

  confirmPlacement() {
    if (!this.isLegal) return false;
    const t = new Ammo.btTransform();
    t.setIdentity();
    t.setOrigin(new Ammo.btVector3(this.previewPosition.x, 0.028575, this.previewPosition.z));
    this.cueBallBody.body.setWorldTransform(t);
    this.cueBallBody.body.setLinearVelocity(new Ammo.btVector3(0,0,0));
    this.cueBallBody.body.setAngularVelocity(new Ammo.btVector3(0,0,0));
    return true;
  }
}