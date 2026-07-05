// import Ammo from 'ammojs-typed';
import * as THREE from 'three';
import mitt from 'mitt';

import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { AssetLoader } from './core/AssetLoader.js';

import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { CollisionDispatcher } from './physics/CollisionDispatcher.js';
import { SpinSolver } from './physics/SpinSolver.js';
import { ClothFriction } from './physics/ClothFriction.js';

import { Table } from './entities/Table.js';
import { Ball } from './entities/Ball.js';
import { Cue } from './entities/Cue.js';
import { rackPositions } from './entities/BallRack.js';

import { GameStateMachine, States } from './gameplay/GameStateMachine.js';
import { EightBallRules } from './gameplay/EightBallRules.js';
import { TurnManager } from './gameplay/TurnManager.js';
import { BallInHandController } from './gameplay/BallInHandController.js';

import { OrbitCameraController } from './controls/OrbitCameraController.js';
import { AimController } from './controls/AimController.js';
import { PowerMeter } from './controls/PowerMeter.js';
import { SpinSelector } from './controls/SpinSelector.js';
import { InputManager } from './controls/InputManager.js';

import { AudioManager } from './audio/AudioManager.js';

import { HUD } from './ui/HUD.js';
import { PowerBarView } from './ui/PowerBarView.js';
import { SpinIndicatorView } from './ui/SpinIndicatorView.js';

import { AmmoUtils } from './utils/AmmoUtils.js';

async function boot() {
  const loadingText = document.getElementById('loading-text');
  loadingText.textContent = 'جارِ تحميل محرك الفيزياء...';

  const AmmoLib = await window.Ammo({
    locateFile: () => '/ammo/ammo.wasm.wasm'
  });

  AmmoUtils.init(AmmoLib);

  // -------------------------------------------------------------
  // 2) الأدوات الأساسية
  // -------------------------------------------------------------
  const eventBus = mitt();
  const canvas = document.getElementById('webgl-canvas');
  const engine = new Engine(canvas);
  const sceneManager = new SceneManager(engine.renderer);

  const assetLoader = new AssetLoader((progress) => {
    document.getElementById('loading-bar-fill').style.width = `${progress * 100}%`;
  });

  const physicsWorld = new PhysicsWorld(AmmoLib);
  physicsWorld.AmmoRef = AmmoLib; // مستخدمة بـ Table/Ball لبناء الـ shapes
  const dispatcher = new CollisionDispatcher(physicsWorld, eventBus);
  const spinSolver = new SpinSolver();
  const clothFriction = new ClothFriction();

  // -------------------------------------------------------------
  // 3) منطق اللعبة
  // -------------------------------------------------------------
  const turnManager = new TurnManager(eventBus);
  const rules = new EightBallRules(eventBus, turnManager);
  const fsm = new GameStateMachine(eventBus);

  // -------------------------------------------------------------
  // 4) الطاولة والكرات
  // -------------------------------------------------------------
  const table = new Table(sceneManager.scene, physicsWorld);

  const balls = [];
  const cueBall = new Ball(sceneManager.scene, physicsWorld, 0, new THREE.Vector3(0, 0.028575, 0.55));
  balls.push(cueBall);

  const rack = rackPositions(-0.56);
  rack.forEach(({ id, position }) => {
    balls.push(new Ball(sceneManager.scene, physicsWorld, id, position));
  });

  const cue = new Cue(sceneManager.scene);

  // -------------------------------------------------------------
  // 5) الكاميرا والتحكم
  // -------------------------------------------------------------
  const cameraController = new OrbitCameraController(sceneManager.camera, canvas);
  cameraController.setTarget(cueBall.mesh.position);

  const inputManager = new InputManager(canvas);
  const raycaster = new THREE.Raycaster();

  const aimController = new AimController(sceneManager.scene, cueBall, sceneManager.camera);
  const powerMeter = new PowerMeter(eventBus);
  const spinCanvas = document.getElementById('spin-selector-canvas');
  const spinSelector = new SpinSelector(spinCanvas);

  const ballInHandController = new BallInHandController(cueBall.body, table, raycaster);

  // -------------------------------------------------------------
  // 6) الصوت
  // -------------------------------------------------------------
  const audio = new AudioManager(sceneManager.camera, eventBus);
  await audio.preload(assetLoader);

  // -------------------------------------------------------------
  // 7) الواجهة
  // -------------------------------------------------------------
  const hud = new HUD(eventBus);
  const powerBarView = new PowerBarView(eventBus);
  const spinIndicatorView = new SpinIndicatorView();

  // -------------------------------------------------------------
  // 8) حلقة إطلاق الضربة (ربط: تصويب -> قوة -> سبين -> إمبالس فعلي على الكرة)
  // -------------------------------------------------------------
  let awaitingRelease = false;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // زر يسار فقط للتصويب/الشوت
    if (fsm.state === States.BALL_IN_HAND) return; // معالج بالأسفل
    if (fsm.state !== States.AIMING) return;
    fsm.transition(States.POWER_CHARGING);
    powerMeter.startCharging();
    awaitingRelease = true;
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0 && awaitingRelease) {
      const impulseMagnitude = powerMeter.release();
      awaitingRelease = false;
      if (impulseMagnitude) fireCueShot(impulseMagnitude);
    }
  });

  // زر يمين أثناء الشحن = إلغاء الضربة
  canvas.addEventListener('contextmenu', () => {
    if (fsm.state === States.POWER_CHARGING) {
      powerMeter.cancel();
      awaitingRelease = false;
      fsm.transition(States.AIMING);
    }
  });

  function fireCueShot(impulseMagnitude) {
    const direction = aimController.aimDirection.clone();
    const tipOffset = spinSelector.tipOffset;

    const { linearImpulse, angularImpulse } = spinSolver.computeStrikeImpulse(
      tipOffset, direction, impulseMagnitude, 0.028575
    );

    cueBall.body.body.activate(true);
    cueBall.body.body.applyCentralImpulse(AmmoUtils.toAmmo(linearImpulse));
    cueBall.body.body.applyTorqueImpulse(AmmoUtils.toAmmo(angularImpulse));

    eventBus.emit('physics:contact', { idA: -2, idB: 0, type: 'BALL_CUE', impactVelocity: impulseMagnitude });

    cue.hide();
    spinSelector.reset();
    fsm.transition(States.SHOT_IN_PROGRESS);
  }

  // -------------------------------------------------------------
  // 9) معالجة Ball-in-Hand (بعد فاول)
  // -------------------------------------------------------------
  eventBus.on('request:ball-in-hand', () => {
    fsm.transition(States.BALL_IN_HAND);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (fsm.state !== States.BALL_IN_HAND) return;
    const otherBalls = balls.filter(b => b !== cueBall && !b.isPocketed);
    ballInHandController.onPointerMove(inputManager.mouseNDC, sceneManager.camera, otherBalls);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (fsm.state !== States.BALL_IN_HAND || e.button !== 0) return;
    const placed = ballInHandController.confirmPlacement();
    if (placed) fsm.transition(States.AIMING);
  });

  // -------------------------------------------------------------
  // 10) ربط نتيجة الرمية بالحالة (shot:settled -> resolve -> next state)
  // -------------------------------------------------------------
  // نستقبل تفاصيل كل رمية من EightBallRules عشان نحدّث المشهد (إخفاء كرات، إلخ)
  eventBus.on('shot:evaluated', (result) => {
    result.pocketed.forEach((id) => {
      const b = balls.find((x) => x.id === id);
      if (b) b.setPocketed();
    });
    if (result.cueScratched) {
      cueBall.respawnAt(new THREE.Vector3(0, 0.028575, 0.55), physicsWorld);
    }
  });
  
  // إذا صارت مخالفة، EightBallRules بيرسل هذا الحدث تلقائياً
  eventBus.on('request:ball-in-hand', () => {
    fsm.transition(States.BALL_IN_HAND);
  });
  
  // إذا صار فوز/خسارة
  eventBus.on('game:over', () => {
    fsm.transition(States.GAME_OVER);
  });
  
  // هذا الهاندلر بيشتغل بعد EightBallRules (لأنه انسجل بعده بالترتيب) —
  // إذا الحالة لسا RESOLVING_SHOT (يعني ما صار فاول ولا فوز)، رجّعها AIMING
  eventBus.on('shot:settled', () => {
    if (fsm.state === States.RESOLVING_SHOT) {
      fsm.transition(States.AIMING);
    }
  });

  // -------------------------------------------------------------
  // 11) حلقة التحديث الرئيسية
  // -------------------------------------------------------------
  engine.onUpdate((deltaTime) => {
    // فيزياء
    physicsWorld.step(deltaTime);
    dispatcher.processCollisions();

    // ⭐ تصفير قسري للسرعة لما تصير صغيرة جداً — يمنع "الحركة الأبدية الوهمية"
    // ويضمن إن isMoving() ترجع false فعلياً بدل ما تقترب من صفر للأبد
    const Ammo = physicsWorld.AmmoRef;
    balls.forEach((ball) => {
      if (ball.isPocketed) return;
      const v = ball.body.body.getLinearVelocity();
      const w = ball.body.body.getAngularVelocity();
      const speed = Math.hypot(v.x(), v.y(), v.z());
      const angSpeed = Math.hypot(w.x(), w.y(), w.z());
      if (speed < 0.02 && angSpeed < 0.05) {
        ball.body.body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
        ball.body.body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
      }
    });

    // احتكاك القماش + السبين لكل كرة نشطة
    balls.forEach((ball) => {
      if (ball.isPocketed) return;
      clothFriction.apply(ball.body, AmmoUtils, THREE.Vector3);
      if (ball.id === 0) spinSolver.applySpinDynamics(ball.body, deltaTime);
    });

    // مزامنة المشاهد مع الفيزياء
    balls.forEach((ball) => ball.syncMeshToBody());

    // فحص الجيوب
    table.pockets.forEach((pocket) => {
      balls.forEach((ball) => {
        if (ball.isPocketed) return;
        const captured = pocket.update(ball.body, ball.mesh);
        if (captured === 'CAPTURED') {
          eventBus.emit('ball:pocketed', { ballId: ball.id });
          eventBus.emit('physics:contact', { idA: ball.id, idB: -3, type: 'BALL_POCKET', impactVelocity: 1 });
        }
      });
    });

    // انتقال حالة: هل استقرت كل الكرات بعد الضربة؟
    fsm.checkSettled(balls.filter(b => !b.isPocketed));

    // كاميرا
    cameraController.update();

    // تحديث التصويب/العصا فقط أثناء AIMING أو شحن القوة
    if (fsm.state === States.AIMING || fsm.state === States.POWER_CHARGING) {
      raycaster.setFromCamera(inputManager.mouseNDC, sceneManager.camera);
      aimController.update(inputManager.mouseNDC, raycaster, table.bounds, balls.filter(b => !b.isPocketed));
      cue.updateTransform(
        cueBall.mesh.position,
        aimController.aimDirection,
        spinSelector.tipOffset,
        powerMeter.currentPower
      );
      spinIndicatorView.update(spinSelector.tipOffset);
    }

    // كاميرا وأوربت معطلة أثناء الرمية الفعلية
    cameraController.setEnabled(fsm.state !== States.SHOT_IN_PROGRESS);

    powerMeter.update(deltaTime);
    sceneManager.render();
  });

  // -------------------------------------------------------------
  // 12) انتهاء التحميل، ابدأ اللعب
  // -------------------------------------------------------------
  document.getElementById('loading-screen').style.display = 'none';
  fsm.state = States.AIMING; // أول حالة بعد نصب الكرات (تخطي BREAK الصارم للتبسيط)
  engine.start();
}

boot().catch((err) => {
  console.error('فشل تشغيل المحاكاة:', err);
  document.getElementById('loading-text').textContent = 'حدث خطأ أثناء التحميل. راجع الكونسول.';
});