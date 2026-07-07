// physics/PhysicsMaterials.js
// All values are physically-researched approximations for
// resin/phenolic balls on worsted wool cloth over slate.

// physics/PhysicsMaterials.js
// All values are physically-researched approximations for
// resin/phenolic balls on worsted wool cloth over slate.

export const MATERIALS = {
  BALL: { 
    restitution: 0.93, 
    friction: 0.18, 
    rollingFriction: 0.005, 
    mass: 0.170, 
    radius: 0.028575 
  },
  CUSHION: { 
    restitution: 0.85, 
    friction: 0.25 
  },
  CLOTH_BED: { 
    restitution: 0.10, 
    friction: 0.20 
  }
};