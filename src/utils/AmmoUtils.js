import * as THREE from 'three';

export const AmmoUtils = {
  _Ammo: null,
  init(AmmoLib) { this._Ammo = AmmoLib; },

  toThree(btVec3) {
    return new THREE.Vector3(btVec3.x(), btVec3.y(), btVec3.z());
  },

  toAmmo(threeVec3) {
    return new this._Ammo.btVector3(threeVec3.x, threeVec3.y, threeVec3.z);
  },

  identityTransform(position) {
    const t = new this._Ammo.btTransform();
    t.setIdentity();
    t.setOrigin(new this._Ammo.btVector3(position.x, position.y, position.z));
    return t;
  },

  /**
   * استدعاء آمن لدوال Ammo التي تختلف توفرها حسب نسخة البناء (build).
   * إذا الدالة موجودة، تُستدعى عادي. إذا غير موجودة، يُطبع تحذير مرة واحدة فقط
   * ولا يوقف تنفيذ باقي الكود.
   */
  safeCall(obj, methodName, ...args) {
    if (obj && typeof obj[methodName] === 'function') {
      return obj[methodName](...args);
    }
    if (!this._warned) this._warned = new Set();
    if (!this._warned.has(methodName)) {
      console.warn(`[AmmoUtils] الدالة "${methodName}" غير متوفرة بهذا البناء من Ammo — تم تجاهلها.`);
      this._warned.add(methodName);
    }
    return undefined;
  },
};