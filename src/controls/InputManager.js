import * as THREE from 'three';

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.leftDown = false;

    domElement.addEventListener('mousemove', (e) => {
      const rect = domElement.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.leftDown = true;
    });
    domElement.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.leftDown = false;
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}