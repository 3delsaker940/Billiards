import * as THREE from 'three';
import { buildCushionCompound } from '../physics/CushionBody.js';
import { PocketSensor } from '../physics/PocketSensor.js';
import { AmmoUtils } from '../utils/AmmoUtils.js';

// Standard 9-foot table proportions scaled to meters (playing surface).
const TABLE_WIDTH = 1.12;
const TABLE_LENGTH = 2.24;

export class Table {
  constructor(scene, physicsWorld) {
    this.width = TABLE_WIDTH;
    this.length = TABLE_LENGTH;
    this.headStringZ = TABLE_LENGTH / 4;

    this.bounds = {
      minX: -TABLE_WIDTH / 2 + 0.03, maxX: TABLE_WIDTH / 2 - 0.03,
      minZ: -TABLE_LENGTH / 2 + 0.03, maxZ: TABLE_LENGTH / 2 - 0.03,
    };

    this._buildSlate(scene);
    this._buildCloth(scene);
    this._buildRailsVisual(scene);
    this._buildCushionPhysics(physicsWorld);
    this._buildPockets(physicsWorld);
  }

  _buildSlate(scene) {
    const geo = new THREE.BoxGeometry(TABLE_WIDTH + 0.4, 0.1, TABLE_LENGTH + 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.8 });
    this.slateMesh = new THREE.Mesh(geo, mat);
    this.slateMesh.position.y = -0.06;
    this.slateMesh.receiveShadow = true;
    scene.add(this.slateMesh);
  }

  _buildCloth(scene) {
    const geo = new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_LENGTH, 32, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b5c33, roughness: 1.0 });
    this.clothMesh = new THREE.Mesh(geo, mat);
    this.clothMesh.rotation.x = -Math.PI / 2;
    this.clothMesh.receiveShadow = true;
    scene.add(this.clothMesh);
  }

  _buildRailsVisual(scene) {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.6 });
    const railHeight = 0.05;
    const thickness = 0.06;

    const long1 = new THREE.Mesh(new THREE.BoxGeometry(thickness, railHeight, TABLE_LENGTH + thickness*2), railMat);
    long1.position.set(TABLE_WIDTH/2 + thickness/2, railHeight/2, 0);
    const long2 = long1.clone(); long2.position.x = -(TABLE_WIDTH/2 + thickness/2);

    const short1 = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH + thickness*2, railHeight, thickness), railMat);
    short1.position.set(0, railHeight/2, TABLE_LENGTH/2 + thickness/2);
    const short2 = short1.clone(); short2.position.z = -(TABLE_LENGTH/2 + thickness/2);

    [long1, long2, short1, short2].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
  }

  _buildCushionPhysics(physicsWorld) {
    this.cushionShape = buildCushionCompound(TABLE_WIDTH, TABLE_LENGTH, 0.05, 0.028575);
    const Ammo = physicsWorld.AmmoRef;
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, this.cushionShape, new Ammo.btVector3(0,0,0));
    this.cushionBody = new Ammo.btRigidBody(rbInfo);
AmmoUtils.safeCall(this.cushionBody, 'setRestitution', 0.85);
AmmoUtils.safeCall(this.cushionBody, 'setFriction', 0.25);
AmmoUtils.safeCall(this.cushionBody, 'setUserIndex', -1);
    physicsWorld.world.addRigidBody(this.cushionBody);

    // Static slate bed floor (thin box under playing surface)
    const bedShape = new Ammo.btBoxShape(new Ammo.btVector3(TABLE_WIDTH/2, 0.01, TABLE_LENGTH/2));
    const bedTransform = new Ammo.btTransform();
    bedTransform.setIdentity();
    bedTransform.setOrigin(new Ammo.btVector3(0, -0.01, 0));
    const bedMotion = new Ammo.btDefaultMotionState(bedTransform);
    const bedInfo = new Ammo.btRigidBodyConstructionInfo(0, bedMotion, bedShape, new Ammo.btVector3(0,0,0));
    const bedBody = new Ammo.btRigidBody(bedInfo);
    AmmoUtils.safeCall(bedBody, 'setRestitution', 0.1);
AmmoUtils.safeCall(bedBody, 'setFriction', 0.20);
AmmoUtils.safeCall(bedBody, 'setUserIndex', -1);
    physicsWorld.world.addRigidBody(bedBody);
  }

  _buildPockets(physicsWorld) {
    const hw = TABLE_WIDTH / 2, hl = TABLE_LENGTH / 2;
    const positions = [
      { x: -hw, z: -hl }, { x: hw, z: -hl },
      { x: -hw, z: 0 },   { x: hw, z: 0 },
      { x: -hw, z: hl },  { x: hw, z: hl },
    ];
    this.pockets = positions.map(p => new PocketSensor(p));
  }

  isInsideBounds(pos, radius) {
    return pos.x > this.bounds.minX + radius && pos.x < this.bounds.maxX - radius &&
           pos.z > this.bounds.minZ + radius && pos.z < this.bounds.maxZ - radius;
  }
}