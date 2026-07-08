import * as THREE from "three";

export function setupEnvironment(scene) {
  scene.background = new THREE.Color(0x0a0f1e);
  scene.fog = new THREE.Fog(0x0a0f1e, 15, 60);
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0f1e,
    roughness: 0.8,
    metalness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5;
  floor.receiveShadow = true;
  scene.add(floor);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const tableLight = new THREE.SpotLight(0xffffff, 1.5);
  tableLight.position.set(0, 25, 0);
  tableLight.angle = Math.PI / 5;
  tableLight.penumbra = 0.8;
  tableLight.castShadow = true;
  scene.add(tableLight);
  const blueAccent = new THREE.PointLight(0x2d6be4, 2, 50);
  blueAccent.position.set(-20, 10, -20);
  scene.add(blueAccent);

  const goldAccent = new THREE.PointLight(0xf59e0b, 2, 50);
  goldAccent.position.set(20, 10, 20);
  scene.add(goldAccent);
}
