import * as THREE from 'three';

export class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0F1E);

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.05, 100
    );
    this.camera.position.set(0, 1.4, 1.6);

    this._setupLights();
    this._setupEnvironment();

    window.addEventListener('resize', () => this.onResize());
  }

  _setupLights() {
    // إضاءة عامة للمشهد تضمن وضوح الأرضية والكراسي وكل تفاصيل الغرفة بشكل مريح
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // الإضاءة العلوية الأساسية (التي فضلتها أولاً) مصلتة مباشرة لتكشف الطاولة والكرات بوضوح
    const spot = new THREE.SpotLight(0xfff4e0, 160, 8, Math.PI / 3, 0.5, 1.2);
    spot.position.set(0, 2.5, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0005;
    spot.shadow.radius = 4; // ظلال ناعمة وواقعية لأرجل الطاولة
    this.scene.add(spot);
    this.scene.add(spot.target);

    // إضاءات جدارية خلفية خفيفة موجهة نحو أعمدة الديكور لتبرير تباين الألوان
    const blueWallLight = new THREE.PointLight(0x2D6BE4, 12, 8);
    blueWallLight.position.set(-3.5, 1.5, -3.5);
    this.scene.add(blueWallLight);

    const goldWallLight = new THREE.PointLight(0xF59E0B, 12, 8);
    goldWallLight.position.set(3.5, 1.5, -3.5);
    this.scene.add(goldWallLight);
  }

  _setupEnvironment() {
    this.scene.fog = null;

    // 1. الأرضية الخشبية
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1B1410,
      roughness: 0.45,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.7;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const floorGrid = new THREE.GridHelper(20, 20, 0x2D221A, 0x2D221A);
    floorGrid.position.y = -0.695;
    this.scene.add(floorGrid);

    // 2. إضافة سجادة فخمة تحت الطاولة (كحلي عميق مع إطار ذهبي عنبري)
    const rugGroup = new THREE.Group();
    
    // قلب السجادة (كحلي)
    const rugGeo = new THREE.BoxGeometry(3.0, 0.015, 4.2);
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x0A0F1E, roughness: 0.9 });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.receiveShadow = true;
    rugGroup.add(rug);

    // إطار السجادة (ذهبي عنبري)
    const rugBorderGeo = new THREE.BoxGeometry(3.2, 0.01, 4.4);
    const rugBorderMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.7 });
    const rugBorder = new THREE.Mesh(rugBorderGeo, rugBorderMat);
    rugBorder.position.y = -0.005;
    rugGroup.add(rugBorder);

    rugGroup.position.set(0, -0.68, 0); // فوق الأرضية الخشبية بشعرة
    this.scene.add(rugGroup);

    // 3. الكراسي المودرن
    this._createChair(new THREE.Vector3(-2.2, -0.7, 0), Math.PI / 2);
    this._createChair(new THREE.Vector3(2.2, -0.7, 0), -Math.PI / 2);

    // 4. أعمدة الإضاءة الجدارية
    this._createLightPillar(new THREE.Vector3(-3.5, -0.7, -3.5), 0x2D6BE4);
    this._createLightPillar(new THREE.Vector3(3.5, -0.7, -3.5), 0xF59E0B);

    // 5. إضافة لوحات جدارية (Posters) تستخدم مجلد التكستشرز
    // إذا عندك صور بالمجلد غير أسماء الملفات هون (مثلاً poster1.jpg). 
    // وفي حال الصورة غير موجودة، سيعرض لوناً بديلاً فخماً.
    this._createPoster(new THREE.Vector3(0, 0.8, -4.5), 0, 'assets/textures/poster1.jpg', 0x2D6BE4);
    this._createPoster(new THREE.Vector3(-2, 0.8, -4.5), 0, 'assets/textures/poster2.jpg', 0x0A0F1E);
    this._createPoster(new THREE.Vector3(2, 0.8, -4.5), 0, 'assets/textures/poster3.jpg', 0xF59E0B);
  }

  // --- دوال البناء المساعدة (الكراسي والأعمدة تبقى كما هي، ونضيف دالة اللوحات) --- //

  _createChair(position, rotationY) {
    const chairGroup = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
    const seatGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    chairGroup.add(seat);
    const backGeo = new THREE.BoxGeometry(0.06, 0.32, 0.44);
    const back = new THREE.Mesh(backGeo, leatherMat);
    back.position.set(-0.18, 0.62, 0);
    back.castShadow = true;
    chairGroup.add(back);
    const legGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.45, 8);
    const legPositions = [[0.14, 0.14], [-0.14, 0.14], [0.14, -0.14], [-0.14, -0.14]];
    legPositions.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(x, 0.225, z);
      leg.castShadow = true;
      chairGroup.add(leg);
    });
    chairGroup.position.copy(position);
    chairGroup.rotation.y = rotationY;
    this.scene.add(chairGroup);
  }

  _createLightPillar(position, colorHex) {
    const pillarGroup = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    pillarGroup.add(body);
    const neonGeo = new THREE.BoxGeometry(0.03, 2.0, 0.03);
    const neonMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.set(0, 1.2, 0.085);
    pillarGroup.add(neon);
    pillarGroup.position.copy(position);
    this.scene.add(pillarGroup);
  }

  // الدالة الجديدة لبناء اللوحات الجدارية وتحميل الصور
  _createPoster(position, rotationY, texturePath, fallbackColor) {
    const frameGroup = new THREE.Group();

    // الإطار الخارجي الأسود
    const frameGeo = new THREE.BoxGeometry(1.2, 1.6, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frameGroup.add(frame);

    // مساحة اللوحة الداخلية (الكانفاس)
    const canvasGeo = new THREE.PlaneGeometry(1.05, 1.45);
    const canvasMat = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.4 });

    // محاولة تحميل الصورة من مجلد assets
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      texturePath,
      (texture) => {
        // إذا نجح التحميل، طبق الصورة وصفر اللون البديل
        texture.colorSpace = THREE.SRGBColorSpace;
        canvasMat.map = texture;
        canvasMat.color.setHex(0xffffff);
        canvasMat.needsUpdate = true;
      },
      undefined,
      (err) => { 
        console.warn('صورة اللوحة غير موجودة، سيتم عرض اللون البديل:', texturePath); 
      }
    );

    const canvas = new THREE.Mesh(canvasGeo, canvasMat);
    canvas.position.z = 0.026; // إبراز الصورة عن الإطار
    frameGroup.add(canvas);

    frameGroup.position.copy(position);
    frameGroup.rotation.y = rotationY;
    this.scene.add(frameGroup);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}