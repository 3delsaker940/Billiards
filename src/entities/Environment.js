import * as THREE from 'three';

export function setupEnvironment(scene) {
    // 1. تغيير لون الخلفية لدرجة كحلية عميقة و مريحة للعين
    scene.background = new THREE.Color(0x0A0F1E);
    // إضافة ضباب خفيف بنفس اللون ليعطي عمق للمشهد ويخفي حواف الأرضية
    scene.fog = new THREE.Fog(0x0A0F1E, 15, 60);

    // 2. إنشاء أرضية بسيطة تحت الطاولة
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x0A0F1E,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    // تأكد إنك تعدل الرقم (-5) حسب ارتفاع الطاولة عندك لحتى تصير الأرضية تحتها مباشرة
    floor.position.y = -5; 
    floor.receiveShadow = true;
    scene.add(floor);

    // 3. الإضاءة
    // إضاءة عامة خفيفة جداً
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // إضاءة مركزية مسلطة على الطاولة (Spotlight)
    const tableLight = new THREE.SpotLight(0xffffff, 1.5);
    tableLight.position.set(0, 25, 0);
    tableLight.angle = Math.PI / 5;
    tableLight.penumbra = 0.8; // تنعيم حواف الإضاءة
    tableLight.castShadow = true;
    scene.add(tableLight);

    // إضاءة محيطية تجميلية (أزرق ياقوتي) من زاوية
    const blueAccent = new THREE.PointLight(0x2D6BE4, 2, 50);
    blueAccent.position.set(-20, 10, -20);
    scene.add(blueAccent);

    // إضاءة محيطية تجميلية (ذهبي عنبري) من الزاوية المعاكسة
    const goldAccent = new THREE.PointLight(0xF59E0B, 2, 50);
    goldAccent.position.set(20, 10, 20);
    scene.add(goldAccent);
}