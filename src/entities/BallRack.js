import * as THREE from 'three';

/** Standard 8-ball triangle rack: 8-ball center of 3rd row, one stripe/solid on each back corner. */
export function rackPositions(footSpotZ = -0.56) {
  const spacing = 0.0575; // slightly more than 2*radius to avoid initial interpenetration
  const rowOffset = spacing * Math.sqrt(3) / 2;

  const order = [
    [1],
    [9, 2],
    [10, 8, 3],
    [11, 4, 12, 5],
    [6, 13, 7, 14, 15],
  ];

  const positions = [];
  order.forEach((row, rowIndex) => {
    const count = row.length;
    const zPos = footSpotZ - rowIndex * rowOffset;
    row.forEach((ballId, i) => {
      const xPos = (i - (count - 1) / 2) * spacing;
      positions.push({ id: ballId, position: new THREE.Vector3(xPos, 0.028575, zPos) });
    });
  });

  return positions;
}