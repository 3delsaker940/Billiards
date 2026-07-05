import * as THREE from 'three';

export class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0e12);

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.05, 100
    );
    this.camera.position.set(0, 1.4, 1.6);

    this._setupLights();
    this._setupEnvironment();

    window.addEventListener('resize', () => this.onResize());
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.5);
    this.scene.add(hemi);

    // Main overhead pool-table lamp
    const spot = new THREE.SpotLight(0xfff4e0, 180, 6, Math.PI / 3.2, 0.4, 1.5);
    spot.position.set(0, 2.2, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0005;
    spot.shadow.radius = 3;
    this.scene.add(spot);
    this.scene.add(spot.target);

    // Fill lights so rails/pockets aren't pitch black
    const fill1 = new THREE.PointLight(0xaad4ff, 20, 5);
    fill1.position.set(1.2, 1, 1.2);
    this.scene.add(fill1);

    const fill2 = new THREE.PointLight(0xaad4ff, 20, 5);
    fill2.position.set(-1.2, 1, -1.2);
    this.scene.add(fill2);
  }

  _setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a22);
    const envTex = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environment = envTex;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}