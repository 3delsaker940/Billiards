import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {
  constructor(onProgress) {
    this.manager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.manager);
    this.gltfLoader = new GLTFLoader(this.manager);
    this.audioLoader = new THREE.AudioLoader(this.manager);

    if (onProgress) {
      this.manager.onProgress = (url, loaded, total) =>
        onProgress(loaded / total);
    }
  }

  loadTexture(path) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(path, resolve, undefined, reject);
    });
  }

  loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(path, (gltf) => resolve(gltf), undefined, reject);
    });
  }

  loadAudio(path) {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(path, resolve, undefined, reject);
    });
  }
}
