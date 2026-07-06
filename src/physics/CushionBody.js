import * as THREE from 'three';

/** يبني قائمة قطع مستقيمة تمثّل حواف الطاولة، بنفس فجوات الجيوب المستخدمة بالرسم */
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