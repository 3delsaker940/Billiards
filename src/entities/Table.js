import * as THREE from 'three';
import { buildCushionSegments } from '../physics/CushionBody.js';
import { PocketSensor } from '../physics/PocketSensor.js';

const TABLE_WIDTH = 1.12;
const TABLE_LENGTH = 2.24;

function computeRailLayout() {
  const hw = TABLE_WIDTH / 2;
  const hl = TABLE_LENGTH / 2;
  const cornerGap = 0.085;
  const middleGap = 0.075;

  const sideSegLen = (hl - cornerGap) - middleGap;
  const sideSegCenter = (middleGap + (hl - cornerGap)) / 2;
  const endSegLen = (hw - cornerGap) * 2;

  return {
    hw, hl, cornerGap, middleGap,
    side: [
      { x: hw,  zCenter:  sideSegCenter, length: sideSegLen },
      { x: hw,  zCenter: -sideSegCenter, length: sideSegLen },
      { x: -hw, zCenter:  sideSegCenter, length: sideSegLen },
      { x: -hw, zCenter: -sideSegCenter, length: sideSegLen },
    ],
    end: [
      { z: hl,  xCenter: 0, length: endSegLen },
      { z: -hl, xCenter: 0, length: endSegLen },
    ],
  };
}

export class Table {
  constructor(scene, physicsWorld) {
    this.width = TABLE_WIDTH;
    this.length = TABLE_LENGTH;
    this.headStringZ = TABLE_LENGTH / 4;
    this.layout = computeRailLayout();

    this.bounds = {
      minX: -TABLE_WIDTH / 2 + 0.03, maxX: TABLE_WIDTH / 2 - 0.03,
      minZ: -TABLE_LENGTH / 2 + 0.03, maxZ: TABLE_LENGTH / 2 - 0.03,
    };

    this._buildSlate(scene);
    this._buildCloth(scene);
    this._buildRailsVisual(scene);
    this._buildPocketVisuals(scene);
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

    this.layout.side.forEach((seg) => {
      const geo = new THREE.BoxGeometry(thickness, railHeight, seg.length);
      const mesh = new THREE.Mesh(geo, railMat);
      mesh.position.set(
        seg.x + (seg.x > 0 ? thickness / 2 : -thickness / 2),
        railHeight / 2,
        seg.zCenter
      );
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
    });

    this.layout.end.forEach((seg) => {
      const geo = new THREE.BoxGeometry(seg.length, railHeight, thickness);
      const mesh = new THREE.Mesh(geo, railMat);
      mesh.position.set(
        seg.xCenter,
        railHeight / 2,
        seg.z + (seg.z > 0 ? thickness / 2 : -thickness / 2)
      );
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
    });
  }

  _buildPocketVisuals(scene) {
    const { hw, hl } = this.layout;
    const positions = [
      { x: -hw, z: -hl }, { x: hw, z: -hl },
      { x: -hw, z: 0 },   { x: hw, z: 0 },
      { x: -hw, z: hl },  { x: hw, z: hl },
    ];
    const pocketRadius = 0.06;
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    positions.forEach((p) => {
      const ringGeo = new THREE.CircleGeometry(pocketRadius, 24);
      const ring = new THREE.Mesh(ringGeo, holeMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.001, p.z);
      scene.add(ring);

      const holeGeo = new THREE.CylinderGeometry(pocketRadius * 0.9, pocketRadius * 0.7, 0.15, 20, 1, true);
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(p.x, -0.08, p.z);
      scene.add(hole);
    });
  }

  /**
   * ⭐ فيزياء بحتة بالكامل: نضيف كل حواف الطاولة كقطع مستقيمة (segments)
   * لمحرك الفيزياء المخصص، بدل أي جسم صلب من مكتبة خارجية.
   */
  _buildCushionPhysics(physicsWorld) {
    const segments = buildCushionSegments(this.layout);
    segments.forEach((seg) => physicsWorld.addCushionSegment(seg.a, seg.b));

    // شبكة أمان خارجية إضافية (تمنع أي كرة نهائياً من مغادرة الطاولة بأي سرعة)
    const margin = 0.15;
    const hw = this.width / 2 + margin;
    const hl = this.length / 2 + margin;
    physicsWorld.addCushionSegment(new THREE.Vector3(hw, 0, -hl), new THREE.Vector3(hw, 0, hl));
    physicsWorld.addCushionSegment(new THREE.Vector3(-hw, 0, -hl), new THREE.Vector3(-hw, 0, hl));
    physicsWorld.addCushionSegment(new THREE.Vector3(-hw, 0, hl), new THREE.Vector3(hw, 0, hl));
    physicsWorld.addCushionSegment(new THREE.Vector3(-hw, 0, -hl), new THREE.Vector3(hw, 0, -hl));
  }

  _buildPockets(physicsWorld) {
    const { hw, hl } = this.layout;
    const positions = [
      { x: -hw, z: -hl }, { x: hw, z: -hl },
      { x: -hw, z: 0 },   { x: hw, z: 0 },
      { x: -hw, z: hl },  { x: hw, z: hl },
    ];
    this.pockets = positions.map((p) => new PocketSensor(p));
  }

  isInsideBounds(pos, radius) {
    return pos.x > this.bounds.minX + radius && pos.x < this.bounds.maxX - radius &&
           pos.z > this.bounds.minZ + radius && pos.z < this.bounds.maxZ - radius;
  }
}