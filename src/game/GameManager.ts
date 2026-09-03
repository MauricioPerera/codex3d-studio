import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicsEngine } from './PhysicsEngine';
import { CharacterController } from './CharacterController';
import { GameplayMechanics } from './GameplayMechanics';
import { AudioSystem } from './AudioSystem';

export interface GameState {
  mode: 'edit' | 'play';
  status: 'ready' | 'playing' | 'won' | 'game_over';
  score: number;
  lives: number;
  gemsCollected: number;
  totalGems: number;
  elapsedTime: number;
}

export class GameManager {
  public mode: 'edit' | 'play' = 'edit';
  public status: 'ready' | 'playing' | 'won' | 'game_over' = 'ready';
  public score = 0;
  public lives = 3;
  public gemsCollected = 0;
  public totalGems = 0;
  public elapsedTime = 0;

  public physics: PhysicsEngine;
  public audio: AudioSystem;
  public controller: CharacterController;
  public mechanics: GameplayMechanics;

  private onStateChangeListeners: Array<(state: GameState) => void> = [];

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private controls: OrbitControls
  ) {
    this.physics = new PhysicsEngine();
    this.audio = new AudioSystem();
    this.controller = new CharacterController(this.scene, this.camera, this.physics, this.audio);
    this.mechanics = new GameplayMechanics(this.scene, this.physics, this.audio);

    this.controller.setActive(false);
  }

  public onStateChange(fn: (state: GameState) => void) {
    this.onStateChangeListeners.push(fn);
  }

  private notify() {
    const s = this.getState();
    this.onStateChangeListeners.forEach(fn => fn(s));
  }

  public getState(): GameState {
    return {
      mode: this.mode,
      status: this.status,
      score: this.score,
      lives: this.lives,
      gemsCollected: this.gemsCollected,
      totalGems: this.totalGems,
      elapsedTime: Math.floor(this.elapsedTime)
    };
  }

  public setMode(newMode: 'edit' | 'play') {
    if (this.mode === newMode) return;
    this.mode = newMode;

    if (newMode === 'play') {
      this.status = 'playing';
      this.score = 0;
      this.lives = 3;
      this.gemsCollected = 0;
      this.elapsedTime = 0;

      // Count total collectibles in scene
      this.totalGems = this.mechanics.items.filter(i => i.type === 'collectible').length;
      this.mechanics.resetCollectibles();

      // Register static colliders for all studio assets in scene
      this.bakeSceneColliders();

      // Disable orbit controls, enable player controller
      this.controls.enabled = false;
      this.controller.setActive(true);
      this.controller.respawn(this.mechanics.activeCheckpoint);
    } else {
      this.status = 'ready';
      this.controller.setActive(false);
      this.controls.enabled = true;
      this.physics.clearNonGround();
    }

    this.notify();
  }

  private bakeSceneColliders() {
    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.userData?.isStudioAsset &&
        !obj.userData?.gameplayType && // Gameplay items manage their own bodies
        obj.name !== '__Studio_Grid__' &&
        obj.name !== '__Studio_Ground__'
      ) {
        // Calculate bounding box for collision shape
        obj.geometry.computeBoundingBox();
        const bbox = obj.geometry.boundingBox;
        if (bbox) {
          const size = new THREE.Vector3();
          bbox.getSize(size);
          // Scale by world scale
          size.multiply(obj.scale);
          if (size.x > 0.05 && size.y > 0.05 && size.z > 0.05) {
            this.physics.registerStaticBox(obj, size.x, size.y, size.z);
          }
        }
      }
    });
  }

  public update(dt: number) {
    if (this.mode !== 'play') return;

    if (this.status === 'playing') {
      this.elapsedTime += dt;
      this.physics.step(dt);
      this.controller.update(dt);

      const playerPos = this.controller.mesh.position;
      this.mechanics.update(dt, playerPos, {
        onCollect: (pts) => {
          this.score += pts;
          this.gemsCollected += 1;
          this.notify();
        },
        onHazard: () => {
          this.lives -= 1;
          if (this.lives <= 0) {
            this.status = 'game_over';
          } else {
            this.controller.respawn(this.mechanics.activeCheckpoint);
          }
          this.notify();
        },
        onJumpPad: (force) => {
          this.controller.jump(force);
        },
        onGoal: () => {
          this.status = 'won';
          this.notify();
        }
      });
    }
  }

  public resetLevel() {
    this.status = 'playing';
    this.score = 0;
    this.lives = 3;
    this.gemsCollected = 0;
    this.elapsedTime = 0;
    this.mechanics.resetCollectibles();
    this.controller.respawn(this.mechanics.activeCheckpoint);
    this.notify();
  }
}
