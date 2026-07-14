import * as THREE from "three";

export class AimController {
  constructor(scene, cueBall, camera) {
    this.scene = scene;
    this.cueBall = cueBall;
    this.camera = camera;
    this.aimDirection = new THREE.Vector3(0, 0, -1);
    this.maxBounces = 2;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.03,
      gapSize: 0.02,
    });
    this.line = new THREE.Line(geometry, material);
    this.line.computeLineDistances();

    scene.add(this.line);

    this.ghostBallMesh = this.createGhostBall();
    this.ghostBallMesh.visible = false;
    scene.add(this.ghostBallMesh);
  }

  createGhostBall() {
    const geo = new THREE.SphereGeometry(0.028575, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    return new THREE.Mesh(geo, mat);
  }

  update(mouseNDC, raycaster, tableBounds, allBalls) {
    raycaster.setFromCamera(mouseNDC, this.camera);
    const planeY = this.cueBall.mesh.position.y;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, target);
    if (!hit) return;

    this.aimDirection.subVectors(target, this.cueBall.mesh.position).setY(0);
    if (this.aimDirection.lengthSq() < 1e-8) return;
    this.aimDirection.normalize();

    const points = this.traceTrajectory(
      this.cueBall.mesh.position.clone(),
      this.aimDirection,
      tableBounds,
      allBalls,
    );

    if (points.length < 2) return;

    this.line.geometry.dispose();
    this.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.line.computeLineDistances();

    if (points.length > 1) {
      this.ghostBallMesh.position
        .copy(points[1])
        .addScaledVector(this.aimDirection, -0.0571);
      this.ghostBallMesh.visible = true;
    }
  }

  traceTrajectory(origin, direction, bounds, allBalls) {
    const points = [origin.clone()];
    let currentPos = origin.clone();
    let currentDir = direction.clone();

    for (let bounce = 0; bounce <= this.maxBounces; bounce++) {
      let nearestT = Infinity;
      let hitBall = null;
      const ballRadius = 0.028575;

      for (const ball of allBalls) {
        if (ball === this.cueBall || ball.isPocketed) continue;
        const toBall = ball.mesh.position.clone().sub(currentPos);
        const proj = toBall.dot(currentDir);
        if (proj < 0) continue;
        const closestPoint = currentPos
          .clone()
          .addScaledVector(currentDir, proj);
        const distSq = closestPoint.distanceToSquared(ball.mesh.position);
        const combinedRadiusSq = (ballRadius * 2) ** 2;
        if (distSq < combinedRadiusSq) {
          const backOff = Math.sqrt(Math.max(0, combinedRadiusSq - distSq));
          const t = proj - backOff;
          if (t < nearestT && t > 0) {
            nearestT = t;
            hitBall = ball;
          }
        }
      }

      const wallT = this.raycastToWalls(currentPos, currentDir, bounds);
      if (wallT < nearestT && wallT !== Infinity) {
        const wallPoint = currentPos.clone().addScaledVector(currentDir, wallT);
        points.push(wallPoint);
        currentDir = this.reflect(
          currentDir,
          this.getWallNormal(wallPoint, bounds),
        );
        currentPos = wallPoint;
        continue;
      }

      if (hitBall && nearestT !== Infinity) {
        points.push(currentPos.clone().addScaledVector(currentDir, nearestT));
      } else {
        points.push(currentPos.clone().addScaledVector(currentDir, 3));
      }
      break;
    }
    return points;
  }

  reflect(dir, normal) {
    return dir.clone().sub(normal.clone().multiplyScalar(2 * dir.dot(normal)));
  }

  raycastToWalls(pos, dir, bounds) {
    let tMin = Infinity;
    ["minX", "maxX"].forEach((k) => {
      const boundX = bounds[k];
      if (Math.abs(dir.x) > 1e-6) {
        const t = (boundX - pos.x) / dir.x;
        if (t > 0) {
          const z = pos.z + dir.z * t;
          if (z >= bounds.minZ && z <= bounds.maxZ && t < tMin) tMin = t;
        }
      }
    });
    ["minZ", "maxZ"].forEach((k) => {
      const boundZ = bounds[k];
      if (Math.abs(dir.z) > 1e-6) {
        const t = (boundZ - pos.z) / dir.z;
        if (t > 0) {
          const x = pos.x + dir.x * t;
          if (x >= bounds.minX && x <= bounds.maxX && t < tMin) tMin = t;
        }
      }
    });
    return tMin;
  }

  getWallNormal(point, bounds) {
    const eps = 0.005;
    if (Math.abs(point.x - bounds.minX) < eps)
      return new THREE.Vector3(1, 0, 0);
    if (Math.abs(point.x - bounds.maxX) < eps)
      return new THREE.Vector3(-1, 0, 0);
    if (Math.abs(point.z - bounds.minZ) < eps)
      return new THREE.Vector3(0, 0, 1);
    return new THREE.Vector3(0, 0, -1);
  }
}
