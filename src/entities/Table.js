import * as THREE from "three";
import { buildCushionSegments } from "../physics/CushionBody.js";
import { PocketSensor } from "../physics/PocketSensor.js";

const TABLE_WIDTH = 1.12;
const TABLE_LENGTH = 2.24;

function computeRailLayout() {
  const hw = TABLE_WIDTH / 2;
  const hl = TABLE_LENGTH / 2;
  const cornerGap = 0.085;
  const middleGap = 0.075;

  const sideSegLen = hl - cornerGap - middleGap;
  const sideSegCenter = (middleGap + (hl - cornerGap)) / 2;
  const endSegLen = (hw - cornerGap) * 2;

  return {
    hw,
    hl,
    cornerGap,
    middleGap,
    side: [
      { x: hw, zCenter: sideSegCenter, length: sideSegLen },
      { x: hw, zCenter: -sideSegCenter, length: sideSegLen },
      { x: -hw, zCenter: sideSegCenter, length: sideSegLen },
      { x: -hw, zCenter: -sideSegCenter, length: sideSegLen },
    ],
    end: [
      { z: hl, xCenter: 0, length: endSegLen },
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
      minX: -TABLE_WIDTH / 2 + 0.03,
      maxX: TABLE_WIDTH / 2 - 0.03,
      minZ: -TABLE_LENGTH / 2 + 0.03,
      maxZ: TABLE_LENGTH / 2 - 0.03,
    };

    this._buildSlate(scene);
    this._buildCloth(scene);
    this._buildRailsVisual(scene);
    this._buildPocketVisuals(scene);
    this._buildCushionPhysics(physicsWorld);
    this._buildPockets(physicsWorld);
  }

  _buildSlate(scene) {
    const hw = (this.width + 0.4) / 2;
    const hl = (this.length + 0.4) / 2;
    const { hw: tableHw, hl: tableHl } = this.layout;
    const pocketRadius = 0.065;

    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hl);
    shape.lineTo(hw, -hl);
    shape.lineTo(hw, hl);
    shape.lineTo(-hw, hl);
    shape.lineTo(-hw, -hl);

    const pockets = [
      { x: -tableHw, y: tableHl },
      { x: tableHw, y: tableHl },
      { x: -tableHw, y: 0 },
      { x: tableHw, y: 0 },
      { x: -tableHw, y: -tableHl },
      { x: tableHw, y: -tableHl },
    ];

    pockets.forEach((p) => {
      const hole = new THREE.Path();
      hole.absarc(p.x, p.y, pocketRadius + 0.005, 0, Math.PI * 2, false);
      shape.holes.push(hole);
    });

    const extrudeSettings = {
      depth: 0.12,
      bevelEnabled: false,
      curveSegments: 24,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x15100c,
      roughness: 0.9,
    });

    this.slateMesh = new THREE.Mesh(geo, mat);
    this.slateMesh.rotation.x = -Math.PI / 2;
    this.slateMesh.position.y = -0.13;
    this.slateMesh.receiveShadow = true;
    scene.add(this.slateMesh);
  }

  _buildCloth(scene) {
    const hw = 1.12 / 2;
    const hl = 2.24 / 2;
    const pR = 0.06;

    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x004d26,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });

    const createStrip = (w, l, x, z) => {
      const geo = new THREE.PlaneGeometry(w, l);
      const mesh = new THREE.Mesh(geo, clothMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.005, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    const gap = 0.12;
    const stripWidth = (hw * 2 - gap * 2) / 3;

    createStrip(stripWidth, hl * 2, -hw + stripWidth / 2 + gap, 0);
    createStrip(stripWidth, hl * 2, 0, 0);
    createStrip(stripWidth, hl * 2, hw - stripWidth / 2 - gap, 0);
  }

  _buildRailsVisual(scene) {
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x0d361f,
      roughness: 0.8,
    });
    const railHeight = 0.05;
    const thickness = 0.06;

    this.layout.side.forEach((seg) => {
      const geo = new THREE.BoxGeometry(thickness, railHeight, seg.length);
      const mesh = new THREE.Mesh(geo, cushionMat);
      mesh.position.set(
        seg.x + (seg.x > 0 ? thickness / 2 : -thickness / 2),
        railHeight / 2,
        seg.zCenter,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    this.layout.end.forEach((seg) => {
      const geo = new THREE.BoxGeometry(seg.length, railHeight, thickness);
      const mesh = new THREE.Mesh(geo, cushionMat);
      mesh.position.set(
        seg.xCenter,
        railHeight / 2,
        seg.z + (seg.z > 0 ? thickness / 2 : -thickness / 2),
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1d1410,
      roughness: 0.35,
      metalness: 0.05,
    });
    const frameThickness = 0.12;
    const frameHeight = 0.055;

    const totalWidth = this.width + thickness * 2;
    const totalLength = this.length + thickness * 2;

    const sideFrameGeo = new THREE.BoxGeometry(
      frameThickness,
      frameHeight,
      totalLength + frameThickness * 2,
    );
    const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
    rightFrame.position.set(
      totalWidth / 2 + frameThickness / 2,
      frameHeight / 2,
      0,
    );
    rightFrame.castShadow = true;
    rightFrame.receiveShadow = true;
    scene.add(rightFrame);

    const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
    leftFrame.position.set(
      -totalWidth / 2 - frameThickness / 2,
      frameHeight / 2,
      0,
    );
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    scene.add(leftFrame);

    const endFrameGeo = new THREE.BoxGeometry(
      totalWidth,
      frameHeight,
      frameThickness,
    );
    const topFrame = new THREE.Mesh(endFrameGeo, frameMat);
    topFrame.position.set(
      0,
      frameHeight / 2,
      totalLength / 2 + frameThickness / 2,
    );
    topFrame.castShadow = true;
    topFrame.receiveShadow = true;
    scene.add(topFrame);

    const bottomFrame = new THREE.Mesh(endFrameGeo, frameMat);
    bottomFrame.position.set(
      0,
      frameHeight / 2,
      -totalLength / 2 - frameThickness / 2,
    );
    bottomFrame.castShadow = true;
    bottomFrame.receiveShadow = true;
    scene.add(bottomFrame);

    this._buildRailDiamonds(
      scene,
      totalWidth,
      totalLength,
      frameHeight,
      frameThickness,
    );
  }

  _buildRailDiamonds(
    scene,
    totalWidth,
    totalLength,
    frameHeight,
    frameThickness,
  ) {
    const diamondGeo = new THREE.SphereGeometry(0.005, 8, 8);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xdcdcdc,
      roughness: 0.2,
      metalness: 0.5,
    });

    const zOffsets = [
      totalLength * 0.375,
      totalLength * 0.125,
      -totalLength * 0.125,
      -totalLength * 0.375,
    ];
    zOffsets.forEach((z) => {
      [-1, 1].forEach((side) => {
        const dMesh = new THREE.Mesh(diamondGeo, diamondMat);
        dMesh.position.set(
          side * (totalWidth / 2 + frameThickness / 2),
          frameHeight + 0.001,
          z,
        );
        scene.add(dMesh);
      });
    });

    const xOffsets = [totalWidth * 0.25, -totalWidth * 0.25];
    xOffsets.forEach((x) => {
      [-1, 1].forEach((side) => {
        const dMesh = new THREE.Mesh(diamondGeo, diamondMat);
        dMesh.position.set(
          x,
          frameHeight + 0.001,
          side * (totalLength / 2 + frameThickness / 2),
        );
        scene.add(dMesh);
      });
    });
  }

  _buildPocketVisuals(scene) {
    const { hw, hl } = this.layout;

    const pockets = [
      { x: -hw, z: -hl, start: 0, len: Math.PI * 1.5 },
      { x: hw, z: -hl, start: Math.PI * 1.5, len: Math.PI * 1.5 },
      { x: -hw, z: 0, start: Math.PI * 0.5, len: Math.PI },
      { x: hw, z: 0, start: Math.PI * 1.5, len: Math.PI },
      { x: -hw, z: hl, start: Math.PI * 0.5, len: Math.PI * 1.5 },
      { x: hw, z: hl, start: Math.PI, len: Math.PI * 1.5 },
    ];

    const pocketRadius = 0.065;
    const frameHeight = 0.055;

    const castingMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.2,
      metalness: 0.8,
    });

    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x020202,
      roughness: 1.0,
      side: THREE.DoubleSide,
    });

    pockets.forEach((p) => {
      const rimGeo = new THREE.RingGeometry(
        pocketRadius,
        pocketRadius + 0.035,
        32,
        1,
        p.start,
        p.len,
      );
      const rim = new THREE.Mesh(rimGeo, castingMat);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(p.x, frameHeight + 0.002, p.z);
      scene.add(rim);

      const baseGeo = new THREE.CylinderGeometry(
        pocketRadius * 0.9,
        pocketRadius * 0.6,
        0.05,
        24,
      );
      const base = new THREE.Mesh(baseGeo, holeMat);
      base.position.set(p.x, -0.1, p.z);
      scene.add(base);
    });
  }

  _buildCushionPhysics(physicsWorld) {
    const segments = buildCushionSegments(this.layout);
    segments.forEach((seg) => physicsWorld.addCushionSegment(seg.a, seg.b));

    const margin = 0.15;
    const hw = this.width / 2 + margin;
    const hl = this.length / 2 + margin;
    physicsWorld.addCushionSegment(
      new THREE.Vector3(hw, 0, -hl),
      new THREE.Vector3(hw, 0, hl),
    );
    physicsWorld.addCushionSegment(
      new THREE.Vector3(-hw, 0, -hl),
      new THREE.Vector3(-hw, 0, hl),
    );
    physicsWorld.addCushionSegment(
      new THREE.Vector3(-hw, 0, hl),
      new THREE.Vector3(hw, 0, hl),
    );
    physicsWorld.addCushionSegment(
      new THREE.Vector3(-hw, 0, -hl),
      new THREE.Vector3(hw, 0, -hl),
    );
  }

  _buildPockets(physicsWorld) {
    const { hw, hl } = this.layout;
    const positions = [
      { x: -hw, z: -hl },
      { x: hw, z: -hl },
      { x: -hw, z: 0 },
      { x: hw, z: 0 },
      { x: -hw, z: hl },
      { x: hw, z: hl },
    ];
    this.pockets = positions.map((p) => new PocketSensor(p));
  }

  isInsideBounds(pos, radius) {
    return (
      pos.x > this.bounds.minX + radius &&
      pos.x < this.bounds.maxX - radius &&
      pos.z > this.bounds.minZ + radius &&
      pos.z < this.bounds.maxZ - radius
    );
  }
}
