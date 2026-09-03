import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine';
import { AudioSystem } from './AudioSystem';
import { ParticleSystem } from './ParticleSystem';

export interface GameplayItem {
  type: 'collectible' | 'hazard' | 'jump_pad' | 'moving_platform' | 'checkpoint' | 'goal';
  mesh: THREE.Object3D;
  body?: CANNON.Body;
  data: any;
  collected?: boolean;
}

export class GameplayMechanics {
  public items: GameplayItem[] = [];
  public activeCheckpoint: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsEngine,
    private audio: AudioSystem,
    private particles?: ParticleSystem
  ) {}

  public spawnCollectible(position: [number, number, number], points = 100): GameplayItem {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.name = `Collectible_Gem_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'collectible' };
    this.scene.add(mesh);

    const item: GameplayItem = {
      type: 'collectible',
      mesh,
      data: { points, baseY: position[1], timeOffset: Math.random() * 10 }
    };
    this.items.push(item);
    return item;
  }

  public spawnHazard(position: [number, number, number], dimensions: [number, number, number] = [3, 0.3, 3]): GameplayItem {
    const [w, h, d] = dimensions;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.name = `Hazard_Lava_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'hazard' };
    this.scene.add(mesh);

    const item: GameplayItem = {
      type: 'hazard',
      mesh,
      data: { dimensions }
    };
    this.items.push(item);
    return item;
  }

  public spawnJumpPad(position: [number, number, number], boostForce = 22): GameplayItem {
    const group = new THREE.Group();
    group.position.set(...position);
    group.name = `JumpPad_${Date.now()}`;
    group.userData = { isStudioAsset: true, gameplayType: 'jump_pad' };

    // Pad base
    const baseGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.2, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Glowing Neon Bouncer
    const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.1, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.1;
    group.add(pad);

    this.scene.add(group);

    const item: GameplayItem = {
      type: 'jump_pad',
      mesh: group,
      data: { boostForce, cooldown: 0 }
    };
    this.items.push(item);
    return item;
  }

  public spawnMovingPlatform(
    start: [number, number, number],
    end: [number, number, number],
    dimensions: [number, number, number] = [3, 0.4, 2],
    speed = 1.5
  ): GameplayItem {
    const [w, h, d] = dimensions;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...start);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `MovingPlatform_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'moving_platform' };
    this.scene.add(mesh);

    const body = this.physics.createKinematicPlatform(
      new THREE.Vector3(w, h, d),
      new THREE.Vector3(...start)
    );

    const item: GameplayItem = {
      type: 'moving_platform',
      mesh,
      body,
      data: {
        start: new THREE.Vector3(...start),
        end: new THREE.Vector3(...end),
        speed,
        progress: 0,
        direction: 1
      }
    };
    this.items.push(item);
    return item;
  }

  public spawnGoal(position: [number, number, number]): GameplayItem {
    const group = new THREE.Group();
    group.position.set(...position);
    group.name = `Goal_Portal_${Date.now()}`;
    group.userData = { isStudioAsset: true, gameplayType: 'goal' };

    // Outer Stargate Ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.22, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // Inner Glowing Core
    const coreGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    this.scene.add(group);

    const item: GameplayItem = {
      type: 'goal',
      mesh: group,
      data: { ring, core }
    };
    this.items.push(item);
    return item;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    callbacks: {
      onCollect: (points: number) => void;
      onHazard: () => void;
      onJumpPad: (force: number) => void;
      onGoal: () => void;
    }
  ) {
    const now = performance.now() * 0.001;

    for (const item of this.items) {
      if (item.type === 'collectible' && !item.collected) {
        // Spin & Bob
        item.mesh.rotation.y += dt * 3.0;
        item.mesh.position.y = item.data.baseY + Math.sin(now * 3 + item.data.timeOffset) * 0.2;

        // Check proximity with player
        const dist = item.mesh.position.distanceTo(playerPos);
        if (dist < 1.1) {
          item.collected = true;
          item.mesh.visible = false;
          this.audio.playCollect();
          if (this.particles) {
            this.particles.emitGemBurst(item.mesh.position);
          }
          callbacks.onCollect(item.data.points);
        }
      } else if (item.type === 'hazard') {
        const dist = item.mesh.position.distanceTo(playerPos);
        if (dist < 1.6) {
          this.audio.playHazard();
          callbacks.onHazard();
        }
      } else if (item.type === 'jump_pad') {
        if (item.data.cooldown > 0) {
          item.data.cooldown -= dt;
        } else {
          const dist = item.mesh.position.distanceTo(playerPos);
          if (dist < 1.1 && playerPos.y >= item.mesh.position.y) {
            item.data.cooldown = 0.5;
            if (this.particles) {
              this.particles.emitBoosterShockwave(item.mesh.position);
            }
            callbacks.onJumpPad(item.data.boostForce);
          }
        }
      } else if (item.type === 'moving_platform') {
        const d = item.data;
        d.progress += dt * d.speed * 0.3 * d.direction;
        if (d.progress >= 1.0) {
          d.progress = 1.0;
          d.direction = -1;
        } else if (d.progress <= 0.0) {
          d.progress = 0.0;
          d.direction = 1;
        }
        item.mesh.position.lerpVectors(d.start, d.end, d.progress);
        if (item.body) {
          item.body.position.copy(item.mesh.position as any);
        }
      } else if (item.type === 'goal') {
        if (item.data.ring) {
          item.data.ring.rotation.x += dt * 1.5;
          item.data.ring.rotation.y += dt * 2.0;
        }
        const dist = item.mesh.position.distanceTo(playerPos);
        if (dist < 1.5) {
          this.audio.playVictory();
          if (this.particles) {
            this.particles.emitConfetti(item.mesh.position);
          }
          callbacks.onGoal();
        }
      }
    }
  }

  public resetCollectibles() {
    for (const item of this.items) {
      if (item.type === 'collectible') {
        item.collected = false;
        item.mesh.visible = true;
      }
    }
  }

  public clear() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      if (item.body) {
        this.physics.removeBody(item.body);
      }
    }
    this.items = [];
  }
}
