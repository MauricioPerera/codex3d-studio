import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine';
import { AudioSystem } from './AudioSystem';

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
    private audio: AudioSystem
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
      emissive: 0xb91c1c,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.name = `Hazard_Lava_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'hazard' };
    this.scene.add(mesh);

    const body = this.physics.registerStaticBox(mesh, w, h, d);

    const item: GameplayItem = {
      type: 'hazard',
      mesh,
      body,
      data: { damage: 1 }
    };
    this.items.push(item);
    return item;
  }

  public spawnJumpPad(position: [number, number, number], boostForce = 21): GameplayItem {
    const geo = new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    mesh.name = `JumpPad_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'jump_pad' };
    this.scene.add(mesh);

    const body = this.physics.registerStaticBox(mesh, 1.6, 0.2, 1.6);

    const item: GameplayItem = {
      type: 'jump_pad',
      mesh,
      body,
      data: { boostForce, cooldown: 0 }
    };
    this.items.push(item);
    return item;
  }

  public spawnMovingPlatform(
    startPos: [number, number, number],
    endPos: [number, number, number],
    dimensions: [number, number, number] = [3, 0.4, 2],
    speed = 1.8
  ): GameplayItem {
    const [w, h, d] = dimensions;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.3,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...startPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `MovingPlatform_${Date.now()}`;
    mesh.userData = { isStudioAsset: true, gameplayType: 'moving_platform' };
    this.scene.add(mesh);

    const body = this.physics.registerKinematicPlatform(mesh, w, h, d);

    const item: GameplayItem = {
      type: 'moving_platform',
      mesh,
      body,
      data: {
        start: new THREE.Vector3(...startPos),
        end: new THREE.Vector3(...endPos),
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

    // Outer spinning ring
    const torusGeo = new THREE.TorusGeometry(1.2, 0.15, 16, 32);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(torusGeo, torusMat);
    group.add(ring);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    group.name = `GoalPortal_${Date.now()}`;
    group.userData = { isStudioAsset: true, gameplayType: 'goal' };
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
      } else if (item.type === 'goal') {
        if (item.data.ring) {
          item.data.ring.rotation.x += dt * 1.5;
          item.data.ring.rotation.y += dt * 2.0;
        }
        const dist = item.mesh.position.distanceTo(playerPos);
        if (dist < 1.5) {
          this.audio.playVictory();
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
