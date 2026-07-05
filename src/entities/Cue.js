import * as THREE from 'three';

export class Cue {
  constructor(scene) {
    const shaftGeo = new THREE.CylinderGeometry(0.006, 0.012, 1.45, 16);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.4 });
    this.mesh = new THREE.Mesh(shaftGeo, shaftMat);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.castShadow = true;
    this.visible = false;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.pullBackDistance = 0;
    this.maxPullBack = 0.35;
  }

  /** Position cue behind cue ball along aim direction, offset by tip strike point + power pullback */
  updateTransform(cueBallPos, aimDirection, tipOffset, powerNormalized) {
    this.mesh.visible = true;
    const ballRadius = 0.028575;
    this.pullBackDistance = 0.05 + powerNormalized * this.maxPullBack;

    const behind = aimDirection.clone().multiplyScalar(-(ballRadius + 0.02 + this.pullBackDistance));
    const tipLateral = new THREE.Vector3(-aimDirection.z, 0, aimDirection.x).multiplyScalar(tipOffset.x * ballRadius * 0.8);
    const tipVertical = new THREE.Vector3(0, tipOffset.y * ballRadius * 0.8, 0);

    const targetPos = cueBallPos.clone().add(behind).add(tipLateral).add(tipVertical);
    this.mesh.position.copy(targetPos);
    this.mesh.position.y += 0; 

    const lookTarget = cueBallPos.clone().add(tipLateral).add(tipVertical);
    this.mesh.lookAt(lookTarget);
    this.mesh.rotateX(Math.PI / 2);
  }

  hide() {
    this.mesh.visible = false;
  }
}