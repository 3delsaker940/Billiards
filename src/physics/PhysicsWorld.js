export class PhysicsWorld {
  constructor(AmmoLib) {
    this.Ammo = AmmoLib;

    this.collisionConfig = new AmmoLib.btDefaultCollisionConfiguration();
    this.dispatcher = new AmmoLib.btCollisionDispatcher(this.collisionConfig);
    this.broadphase = new AmmoLib.btDbvtBroadphase();
    this.solver = new AmmoLib.btSequentialImpulseConstraintSolver();

    this.world = new AmmoLib.btDiscreteDynamicsWorld(
      this.dispatcher, this.broadphase, this.solver, this.collisionConfig
    );

    this.world.setGravity(new AmmoLib.btVector3(0, -9.81, 0));

    // بعض نسخ بناء Ammo.js ما بتعرّض set_m_numIterations كـ دالة،
    // فبنجرب الطريقتين ونتجاهل بهدوء إذا ولا وحدة اشتغلت
    // (القيمة الافتراضية 10 كافية، بس 20 أدق مع تجمعات كرات كثيرة)
    try {
      const info = this.world.getSolverInfo();
      if (typeof info.set_m_numIterations === 'function') {
        info.set_m_numIterations(20);
      } else if ('m_numIterations' in info) {
        info.m_numIterations = 20;
      }
    } catch (e) {
      console.warn('تعذّر ضبط عدد تكرارات الحل الفيزيائي، سيُستخدم الإعداد الافتراضي.', e);
    }
  }

  step(deltaSeconds) {
    this.world.stepSimulation(deltaSeconds, 8, 1 / 240);
  }
}