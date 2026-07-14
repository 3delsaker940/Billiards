import * as THREE from "three";

export function closestPointOnSegment(point, segA, segB) {
  const p = new THREE.Vector3(point.x, 0, point.z);
  const a = new THREE.Vector3(segA.x, 0, segA.z);
  const b = new THREE.Vector3(segB.x, 0, segB.z);
  const seg = new THREE.Vector3().subVectors(b, a);
  const segLenSq = seg.lengthSq();
  if (segLenSq < 1e-9) return a;
  let t = new THREE.Vector3().subVectors(p, a).dot(seg) / segLenSq;
  t = Math.max(0, Math.min(1, t));
  return a.addScaledVector(seg, t);
}

export function sweptSphereSphereTime(
  posA,
  velA,
  radiusA,
  posB,
  velB,
  radiusB,
  maxT,
) {
  const d0 = new THREE.Vector3().subVectors(posA, posB);
  const dv = new THREE.Vector3().subVectors(velA, velB);
  const R = radiusA + radiusB;

  const a = dv.dot(dv);
  const b = 2 * d0.dot(dv);
  const c = d0.dot(d0) - R * R;

  if (c < 0) return null;
  if (a < 1e-9) return null;

  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;

  const t1 = (-b - Math.sqrt(disc)) / (2 * a);
  if (t1 >= 0 && t1 <= maxT) return t1;
  return null;
}

export function sweptSphereSegmentTime(pos, vel, radius, segA, segB, maxT) {
  const posXZ = new THREE.Vector3(pos.x, 0, pos.z);
  const velXZ = new THREE.Vector3(vel.x, 0, vel.z);
  const segAXZ = new THREE.Vector3(segA.x, 0, segA.z);
  const segBXZ = new THREE.Vector3(segB.x, 0, segB.z);

  const seg = new THREE.Vector3().subVectors(segBXZ, segAXZ);
  const segLenSq = seg.lengthSq();
  if (segLenSq < 1e-9) return null;
  const segLen = Math.sqrt(segLenSq);
  const u = seg.clone().divideScalar(segLen);

  const w0full = new THREE.Vector3().subVectors(posXZ, segAXZ);
  const w0proj = w0full.dot(u);
  const w0perp = w0full.clone().addScaledVector(u, -w0proj);

  const vProj = velXZ.dot(u);
  const vPerp = velXZ.clone().addScaledVector(u, -vProj);

  const a = vPerp.dot(vPerp);
  const b = 2 * w0perp.dot(vPerp);
  const c = w0perp.dot(w0perp) - radius * radius;

  if (c < 0) return null;
  if (a < 1e-9) return null;

  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t1 = (-b - Math.sqrt(disc)) / (2 * a);
  if (t1 < 0 || t1 > maxT) return null;

  const hitParam = w0proj + vProj * t1;
  if (hitParam < 0 || hitParam > segLen) return null;

  return t1;
}
