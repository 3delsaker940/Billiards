import * as THREE from 'three';
import mitt from 'mitt';

import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { AssetLoader } from './core/AssetLoader.js';

import { PhysicsWorld } from './physics/PhysicsWorld.js';
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


async function boot() {
  const eventBus = mitt();
  const canvas = document.getElementById('webgl-canvas');
  const engine = new Engine(canvas);
  const sceneManager = new SceneManager(engine.renderer);
  const assetLoader = new AssetLoader((p) => { document.getElementById('loading-bar-fill').style.width = `${p*100}%`; });

  // ⭐ لا يوجد أي انتظار غير متزامن هون — المحرك جافاسكريبت خالص، يعمل فوراً
  const physicsWorld = new PhysicsWorld();
  const spinSolver = new SpinSolver();
  const clothFriction = new ClothFriction();
  physicsWorld.setSpinSolver(spinSolver);

  const turnManager = new TurnManager(eventBus);
  const rules = new EightBallRules(eventBus, turnManager);
  const fsm = new GameStateMachine(eventBus);

  const table = new Table(sceneManager.scene, physicsWorld);
  const balls = [];
  const cueBall = new Ball(sceneManager.scene, physicsWorld, 0, new THREE.Vector3(0, 0.028575, 0.55));
  balls.push(cueBall);
  rackPositions(-0.56).forEach(({ id, position }) => {
    balls.push(new Ball(sceneManager.scene, physicsWorld, id, position));
  });

  const cue = new Cue(sceneManager.scene);
  const cameraController = new OrbitCameraController(sceneManager.camera, canvas);
  cameraController.setTarget(cueBall.mesh.position);
  const inputManager = new InputManager(canvas);
  const raycaster = new THREE.Raycaster();
  const aimController = new AimController(sceneManager.scene, cueBall, sceneManager.camera);
  const powerMeter = new PowerMeter(eventBus, { minPower: 0.5, maxPower: 12, cycleDuration: 2.4 });
  const spinSelector = new SpinSelector(document.getElementById('spin-selector-canvas'));
  const ballInHandController = new BallInHandController(cueBall, table, raycaster);

  const audio = new AudioManager(sceneManager.camera, eventBus);
  await audio.preload(assetLoader);
  const hud = new HUD(eventBus);
  const powerBarView = new PowerBarView(eventBus);
  const spinIndicatorView = new SpinIndicatorView();

  let awaitingRelease = false;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || fsm.state === States.BALL_IN_HAND || fsm.state !== States.AIMING) return;
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

  canvas.addEventListener('contextmenu', () => {
    if (fsm.state === States.POWER_CHARGING) {
      powerMeter.cancel();
      awaitingRelease = false;
      fsm.transition(States.AIMING);
    }
  });

  function fireCueShot(impulseMagnitude) {
    const direction = aimController.aimDirection.clone();
    const { linearImpulse, angularImpulse } = spinSolver.computeStrikeImpulse(
      spinSelector.tipOffset, direction, impulseMagnitude, cueBall.body.radius
    );
    cueBall.body.applyCentralImpulse(linearImpulse);
    cueBall.body.applyTorqueImpulse(angularImpulse);
    eventBus.emit('physics:contact', { idA: -2, idB: 0, type: 'BALL_CUE', impactVelocity: impulseMagnitude });
    cue.hide();
    spinSelector.reset();
    fsm.transition(States.SHOT_IN_PROGRESS);
  }

  eventBus.on('request:ball-in-hand', () => fsm.transition(States.BALL_IN_HAND));

  canvas.addEventListener('mousemove', () => {
    if (fsm.state !== States.BALL_IN_HAND) return;
    ballInHandController.onPointerMove(inputManager.mouseNDC, sceneManager.camera, balls.filter(b => b !== cueBall && !b.isPocketed));
  });

  canvas.addEventListener('mousedown', () => {
    if (fsm.state !== States.BALL_IN_HAND) return;
    if (ballInHandController.confirmPlacement()) fsm.transition(States.AIMING);
  });

  eventBus.on('shot:evaluated', (result) => {
    result.pocketed.forEach((id) => balls.find(b => b.id === id)?.setPocketed());
    if (result.cueScratched) cueBall.respawnAt(new THREE.Vector3(0, 0.028575, 0.55));
    if (result.gameOver) { fsm.transition(States.GAME_OVER); return; }
    fsm.transition(result.requestBallInHand ? States.BALL_IN_HAND : States.AIMING);
  });

  engine.onUpdate((deltaTime) => {
    const activeBalls = balls.filter((b) => !b.isPocketed);

    activeBalls.forEach((ball) => {
      clothFriction.apply(ball.body);
      if (ball.id === 0) spinSolver.applySpinDynamics(ball.body, deltaTime);
    });

    physicsWorld.step(deltaTime); // ⭐ الفيزياء المخصصة بالكامل

    physicsWorld.contactEvents.forEach((evt) => eventBus.emit('physics:contact', evt));

    activeBalls.forEach((ball) => ball.syncMeshToBody());

    table.pockets.forEach((pocket) => {
      balls.forEach((ball) => {
        if (ball.isPocketed) return;
        const state = pocket.update(ball.body, deltaTime);
        if (state === 'CAPTURED') eventBus.emit('ball:pocketed', { ballId: ball.id });
        else if (state === 'SETTLED') ball.setPocketed();
      });
    });

    fsm.checkSettled(activeBalls.filter((b) => !b.body.rigidBody.isFalling));
    cameraController.update();

    if (fsm.state === States.AIMING || fsm.state === States.POWER_CHARGING) {
      raycaster.setFromCamera(inputManager.mouseNDC, sceneManager.camera);
      aimController.update(inputManager.mouseNDC, raycaster, table.bounds, balls.filter((b) => !b.isPocketed));
      cue.updateTransform(cueBall.mesh.position, aimController.aimDirection, spinSelector.tipOffset, powerMeter.currentPower);
      spinIndicatorView.update(spinSelector.tipOffset);
    }

    cameraController.setEnabled(fsm.state !== States.SHOT_IN_PROGRESS);
    powerMeter.update(deltaTime);
    sceneManager.render();
  });

  document.getElementById('loading-screen').style.display = 'none';
  fsm.state = States.AIMING;
  engine.start();
}

boot().catch((err) => {
  console.error('فشل تشغيل المحاكاة:', err);
  document.getElementById('loading-text').textContent = 'حدث خطأ أثناء التحميل. راجع الكونسول.';
});