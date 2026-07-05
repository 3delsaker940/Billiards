// physics/PocketSensor.js
export class PocketSensor {
  constructor(position, jawRadius = 0.06, dropRadius = 0.05) {
    this.position = position;
    this.jawRadius = jawRadius;   // outer radius: ball starts curving in
    this.dropRadius = dropRadius; // inner radius: point of no return, gravity takes over
    this.capturedBalls = new Set();
  }

  update(ballBody, ballMesh) {
    const pos = ballBody.body.getWorldTransform().getOrigin();
    const dx = pos.x() - this.position.x;
    const dz = pos.z() - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this.jawRadius && !this.capturedBalls.has(ballBody)) {
      // Stage 1: within jaw radius — apply gentle centripetal pull toward pocket center
      // instead of an instant snap. This is what makes "lip-out" shots possible/visible.
      const pullStrength = 1.2 * (1 - dist / this.jawRadius);
      const pull = new Ammo.btVector3(-dx * pullStrength, 0, -dz * pullStrength);
      ballBody.body.applyCentralForce(pull);
    }

    if (dist < this.dropRadius) {
      this.capturedBalls.add(ballBody);
      // Stage 2: disable normal collision response, let gravity + a mild
      // damping pull it down through a scripted "fall" curve into a below-table
      // collection point. Physics body remains active (so it doesn't just vanish),
      // but is removed from cushion/ball collision groups.
      ballBody.body.setCollisionFlags(
        ballBody.body.getCollisionFlags() | 4 /* CF_NO_CONTACT_RESPONSE */
      );
      return 'CAPTURED'; // signal to ShotResolver
    }
    return null;
  }
}