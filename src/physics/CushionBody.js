import * as THREE from "three";
export function buildCushionSegments(layout) {
  const segments = [];

  layout.side.forEach((seg) => {
    const halfLen = seg.length / 2;
    segments.push({
      a: new THREE.Vector3(seg.x, 0, seg.zCenter - halfLen),
      b: new THREE.Vector3(seg.x, 0, seg.zCenter + halfLen),
    });
  });

  layout.end.forEach((seg) => {
    const halfLen = seg.length / 2;
    segments.push({
      a: new THREE.Vector3(seg.xCenter - halfLen, 0, seg.z),
      b: new THREE.Vector3(seg.xCenter + halfLen, 0, seg.z),
    });
  });

  return segments;
}
