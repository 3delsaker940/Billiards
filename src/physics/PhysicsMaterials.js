// physics/PhysicsMaterials.js
// All values are physically-researched approximations for
// resin/phenolic balls on worsted wool cloth over slate.

export const MATERIALS = {
  BALL: {
    restitution: 0.93,       // ball-to-ball is highly elastic
    friction: 0.18,          // sliding friction ball-on-cloth
    rollingFriction: 0.005,  // very low — real balls roll long distances
    spinningFriction: 0.09,  // resistance to friction-induced spin decay
    linearDamping: 0.10,     // approximates cloth nap drag
    angularDamping: 0.15,
    mass: 0.170,             // kg, regulation pool ball (~6oz)
    radius: 0.028575,        // meters (2.25in diameter)
    ccdMotionThreshold: 0.014,   // half of radius — triggers CCD on fast shots
    ccdSweptSphereRadius: 0.02,  // slightly less than actual radius
  },
  CUSHION: {
    restitution: 0.85,       // rubber cushions absorb some energy
    friction: 0.25,
  },
  CLOTH_BED: {
    restitution: 0.10,       // ball shouldn't bounce off the slate bed
    friction: 0.20,
  },
  CUE_TIP: {
    restitution: 0.6,        // leather tip, dampened transient contact
    friction: 0.6,           // high friction = better spin transfer at contact
  },
  POCKET_JAW: {
    restitution: 0.3,        // jaws should "eat" energy, not bounce balls out unrealistically
    friction: 0.4,
  }
};