import { RigidBody } from './RigidBody.js';
import { MATERIALS } from './PhysicsMaterials.js';

export class BallBody {
  constructor(physicsWorld, position, id) {
    const m = MATERIALS.BALL;
    this.id = id;
    this.isPocketed = false;
    this.rigidBody = new RigidBody({ position, radius: m.radius, mass: m.mass });
    physicsWorld.addBody(this);
  }

  get position() { return this.rigidBody.position; }
  get velocity() { return this.rigidBody.velocity; }
  get angularVelocity() { return this.rigidBody.angularVelocity; }
  get orientation() { return this.rigidBody.orientation; }
  get radius() { return this.rigidBody.radius; }
  get mass() { return this.rigidBody.mass; }
  get invMass() { return this.rigidBody.invMass; }

  applyCentralImpulse(impulse) { this.rigidBody.applyCentralImpulse(impulse); }
  applyTorqueImpulse(impulse) { this.rigidBody.applyTorqueImpulse(impulse); }
  applyForce(force) { this.rigidBody.applyForce(force); }
  applyTorque(torque) { this.rigidBody.applyTorque(torque); }
  isMoving(threshold) { return this.rigidBody.isMoving(threshold); }

  setPositionInstant(position) {
    this.rigidBody.position.copy(position);
    this.rigidBody.velocity.set(0, 0, 0);
    this.rigidBody.angularVelocity.set(0, 0, 0);
  }
}