import * as THREE from 'three';

export class SpinSolver {
  constructor(config = {}) {
    this.magnusCoefficient = config.magnusCoefficient ?? 0.00042;
  }

  computeStrikeImpulse(tipOffset, cueDirection, power, ballRadius) {
    const maxOffset = ballRadius * 0.9;
    const localX = tipOffset.x * maxOffset;
    const localY = tipOffset.y * maxOffset;

    const forward = cueDirection.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();

    const linearImpulse = forward.clone().multiplyScalar(power);
    const contactPoint = right.clone().multiplyScalar(localX).add(up.clone().multiplyScalar(localY));
    
    // العزم هو الجداء التقاطعي بين ذراع القوة (موقع الضربة) ومتجه القوة
    const angularImpulse = new THREE.Vector3().crossVectors(contactPoint, linearImpulse);

    const offsetMagnitude = Math.sqrt(tipOffset.x ** 2 + tipOffset.y ** 2);
    return { linearImpulse, angularImpulse, miscueRisk: offsetMagnitude > 0.85, contactPoint };
  }

  applySpinDynamics(ballBody) {
    const v = ballBody.velocity;
    const w = ballBody.angularVelocity;
    if (v.length() < 0.001) return;

    // تأثير الماغنوس (Swerve/Masse Effect) - انحراف الكرة بسبب الهواء والدوران
    // F_magnus = C * (w x v)
    const magnus = new THREE.Vector3().crossVectors(w, v).multiplyScalar(this.magnusCoefficient);
    ballBody.applyForce(magnus);
    
    // تم إزالة كود الاحتكاك من هنا لأنه يُعالج بالكامل في ClothFriction.js
  }

  applyThrowEffect(rigidBodyA, rigidBodyB, contactNormal, j) {
    if (j <= 0) return; // إذا مافي قوة صدمة عمودية، مستحيل يتولد رمي جانبي
    
    const tangentSpin = rigidBodyA.angularVelocity.clone().projectOnPlane(contactNormal);
    if (tangentSpin.length() < 0.1) return;

    // اتجاه الرمي المماسي
    const throwDir = tangentSpin.clone().cross(contactNormal).normalize();
    
    // الفيزياء الحقيقية: معامل الاحتكاك بين كرات الفينوليك بريسين حوالي 0.05 إلى 0.08
    const ballToBallFriction = 0.06;
    
    // الحد الأقصى الفيزيائي المسموح به لقوة الرمي (قانون نيوتن للاحتكاك: F_max = mu * N)
    const maxThrowImpulse = j * ballToBallFriction;
    
    // القوة المتولدة بناءً على سرعة الدوران، وبشرط ألا تتخطى الحد الأقصى الفيزيائي
    const throwMagnitude = Math.min(tangentSpin.length() * 0.0005 * j, maxThrowImpulse);
    const throwImpulse = throwDir.multiplyScalar(throwMagnitude);

    // تطبيق قانون نيوتن الثالث: الفعل ورد الفعل بالسرعة الخطية
    rigidBodyB.applyCentralImpulse(throwImpulse);
    rigidBodyA.applyCentralImpulse(throwImpulse.clone().negate());
    
    // تأثير رد الفعل على سرعة الدوران نفسها (الكرة تفقد جزء من الـ spin بسبب الاحتكاك)
    const rA = contactNormal.clone().multiplyScalar(rigidBodyA.radius);
    const torqueA = rA.cross(throwImpulse);
    rigidBodyA.angularVelocity.addScaledVector(torqueA, -rigidBodyA.invInertia);
  }
}