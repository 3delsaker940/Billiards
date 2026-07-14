export class BallInHandController {
  constructor(cueBallEntity, table, raycaster) {
    this.cueBallEntity = cueBallEntity;
    this.table = table;
    this.raycaster = raycaster;
    this.previewPosition = null;
    this.isLegal = false;
  }

  onPointerMove(ndcPos, camera, otherBalls, restrictedToKitchen = false) {
    this.raycaster.setFromCamera(ndcPos, camera);
    const hit = this.raycaster.intersectObject(this.table.slateMesh)[0];
    if (!hit) return;
    const pos = hit.point.clone();
    pos.y = 0.028575;
    if (restrictedToKitchen && pos.z > this.table.headStringZ)
      pos.z = this.table.headStringZ;
    this.previewPosition = pos;
    this.isLegal = this.validatePosition(pos, otherBalls);
  }

  validatePosition(pos, otherBalls) {
    const r = 0.028575;
    for (const ball of otherBalls) {
      if (pos.distanceTo(ball.mesh.position) < r * 2.05) return false;
    }
    return this.table.isInsideBounds(pos, r);
  }

  confirmPlacement() {
    if (!this.isLegal || !this.previewPosition) return false;
    this.cueBallEntity.respawnAt(this.previewPosition);
    return true;
  }
}
