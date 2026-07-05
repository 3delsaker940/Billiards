import * as THREE from 'three';

/**
 * Custom orbital camera: orbits around a focus point (cue ball or table center),
 * clamps to stay above the slate, and disables itself during active shots.
 */
export class OrbitCameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.target = new THREE.Vector3(0, 0.03, 0);
    this.radius = 1.4;
    this.minRadius = 0.35;
    this.maxRadius = 3.2;

    this.azimuth = 0;        // horizontal angle
    this.polar = 1.0;        // vertical angle (radians from top)
    this.minPolar = 0.25;    // prevent flipping over the top
    this.maxPolar = 1.52;    // prevent going below table (near-horizontal)

    this.enabled = true;
    this.rotateSpeed = 0.005;
    this.zoomSpeed = 0.0015;
    this.damping = 0.12;

    this._targetAzimuth = this.azimuth;
    this._targetPolar = this.polar;
    this._targetRadius = this.radius;

    this._isDragging = false;
    this._lastX = 0; this._lastY = 0;

    this._bindEvents();
    this._updateCameraPosition();
  }

  _bindEvents() {
    this.domElement.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.button !== 2) return; // right-mouse-drag to orbit; left is reserved for aiming
      this._isDragging = true;
      this._lastX = e.clientX; this._lastY = e.clientY;
    });
    window.addEventListener('pointerup', () => { this._isDragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!this._isDragging || !this.enabled) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX; this._lastY = e.clientY;
      this._targetAzimuth -= dx * this.rotateSpeed;
      this._targetPolar = THREE.MathUtils.clamp(
        this._targetPolar - dy * this.rotateSpeed, this.minPolar, this.maxPolar
      );
    });
    this.domElement.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this._targetRadius = THREE.MathUtils.clamp(
        this._targetRadius + e.deltaY * this.zoomSpeed, this.minRadius, this.maxRadius
      );
    }, { passive: false });
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) this._isDragging = false;
  }

  /** Smoothly re-focus on a new point (e.g. cue ball after ball-in-hand placement) */
  setTarget(vec3) {
    this.target.copy(vec3);
  }

  update() {
    this.azimuth += (this._targetAzimuth - this.azimuth) * this.damping;
    this.polar += (this._targetPolar - this.polar) * this.damping;
    this.radius += (this._targetRadius - this.radius) * this.damping;
    this._updateCameraPosition();
  }

  _updateCameraPosition() {
    const sinPolar = Math.sin(this.polar);
    const x = this.target.x + this.radius * sinPolar * Math.sin(this.azimuth);
    const y = this.target.y + this.radius * Math.cos(this.polar);
    const z = this.target.z + this.radius * sinPolar * Math.cos(this.azimuth);

    // Hard floor clamp: camera can never dip below the slate surface
    this.camera.position.set(x, Math.max(y, 0.05), z);
    this.camera.lookAt(this.target);
  }
}