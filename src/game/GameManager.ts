import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicsEngine } from './PhysicsEngine';
import { CharacterController } from './CharacterController';
import { GameplayMechanics } from './GameplayMechanics';
import { AudioSystem } from './AudioSystem';
import { ParticleSystem } from './ParticleSystem';

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
  public particles: ParticleSystem;
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
    this.particles = new ParticleSystem(this.scene);
    this.controller = new CharacterController(this.scene, this.camera, this.physics, this.audio, this.particles);
    this.mechanics = new GameplayMechanics(this.scene, this.physics, this.audio, this.particles);

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

  public setMode(mode: 'edit' | 'play') {
    if (this.mode === mode) return;
    this.mode = mode;

    if (mode === 'play') {
      this.controls.enabled = false;
      this.controller.setActive(true);
      this.controller.respawn(this.mechanics.activeCheckpoint);
      this.resetLevel();

      // Bake scene colliders into physics engine
      this.physics.clearColliders();
      this.bakeSceneColliders();
    } else {
      this.controls.enabled = true;
      this.controller.setActive(false);
      this.status = 'ready';
    }

    this.notify();
  }

  private bakeSceneColliders() {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.isStudioAsset) {
        if (child.name.startsWith('__Studio_') || child.name.startsWith('__Player_')) return;
        if (child.userData?.gameplayType === 'hazard' || child.userData?.gameplayType === 'collectible') return;

        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        if (bbox) {
          const size = new THREE.Vector3();
          bbox.getSize(size);
          size.multiply(child.scale);

          const worldPos = new THREE.Vector3();
          child.getWorldPosition(worldPos);

          this.physics.createStaticBox(size, worldPos);
        }
      }
    });
  }

  public update(dt: number) {
    this.particles.update(dt);

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
        onSpeedRing: () => {
          this.controller.applyTurbo(5.0);
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
    this.particles.clear();
    this.mechanics.resetCollectibles();
    this.totalGems = this.mechanics.items.filter(i => i.type === 'collectible').length;
    this.controller.respawn(this.mechanics.activeCheckpoint);
    this.notify();
  }
}
