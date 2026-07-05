import * as THREE from 'three';

export class Cue {
  constructor(scene) {
    this.length = 1.45;
    // تم التعديل هنا: الأعلى سميك (0.012) والأسفل رفيع (0.006)
    const shaftGeo = new THREE.CylinderGeometry(0.012, 0.006, this.length, 16);
    shaftGeo.translate(0, this.length / 2, 0); 
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.4 });
    this.mesh = new THREE.Mesh(shaftGeo, shaftMat);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.maxPullBack = 0.35;
    this.restGap = 0.015; 
  }

  updateTransform(cueBallPos, aimDirection, tipOffset, powerNormalized) {
    this.mesh.visible = true;
    const ballRadius = 0.028575;
    const pullBack = 0.02 + powerNormalized * this.maxPullBack;

    const dir = aimDirection.clone().normalize(); 

    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    const lateral = right.multiplyScalar(tipOffset.x * ballRadius * 0.7);
    const vertical = new THREE.Vector3(0, tipOffset.y * ballRadius * 0.7, 0);

    const tipPoint = cueBallPos.clone()
      .add(lateral).add(vertical)
      .addScaledVector(dir, -(ballRadius + this.restGap + pullBack));

    this.mesh.position.copy(tipPoint);

    // توجيه العصا للخلف عكس اتجاه الضربة
    const up = new THREE.Vector3(0, 1, 0);
    this.mesh.quaternion.setFromUnitVectors(up, dir.clone().negate());
  }

  hide() {
    this.mesh.visible = false;
  }
}