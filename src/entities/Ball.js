import * as THREE from 'three';
import { BallBody } from '../physics/BallBody.js';

const BALL_COLORS = {
  0: 0xffffff, 1: 0xf3c11a, 2: 0x1b4fc4, 3: 0xd12b2b, 4: 0x5c2d91,
  5: 0xe3641b, 6: 0x1f7a3b, 7: 0x7a1f2b, 8: 0x111111,
  9: 0xf3c11a, 10: 0x1b4fc4, 11: 0xd12b2b, 12: 0x5c2d91,
  13: 0xe3641b, 14: 0x1f7a3b, 15: 0x7a1f2b,
};
const STRIPE_IDS = new Set([9,10,11,12,13,14,15]);

export class Ball {
  constructor(scene, physicsWorld, id, position) {
    this.id = id;
    this.isStripe = STRIPE_IDS.has(id);
    this.isPocketed = false;

    const radius = 0.028575;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: BALL_COLORS[id],
      roughness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(position);

    if (id !== 0 && id !== 8) this._addNumberLabel(id, radius);

    scene.add(this.mesh);

    this.body = new BallBody(physicsWorld, position, id);
  }

  _addNumberLabel(id, radius) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.isStripe ? BALL_COLORS[id] === undefined ? '#fff' : `#${BALL_COLORS[id].toString(16)}` : '#ffffff';
    ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(id), 64, 66);

    const tex = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const labelGeo = new THREE.CircleGeometry(radius * 0.55, 24);
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0, radius * 1.001);
    this.mesh.add(label.clone());
    const back = label.clone();
    back.position.set(0, 0, -radius * 1.001);
    back.rotation.y = Math.PI;
    this.mesh.add(back);
  }

syncMeshToBody() {
    if (this.isPocketed) return;
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.orientation);
  }

  setPocketed() {
    this.isPocketed = true;
    this.body.isPocketed = true;
    this.mesh.visible = false;
  }

  respawnAt(position) {
    this.isPocketed = false;
    this.body.isPocketed = false;
    this.body.rigidBody.isFalling = false;
    this.mesh.visible = true;
    this.body.setPositionInstant(position);
  }
}