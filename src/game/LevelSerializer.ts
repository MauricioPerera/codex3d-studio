import * as THREE from 'three';
import { StudioEngine } from '../engine/StudioEngine';
import { MaterialPreset, LightingPreset } from '../engine/types';

export interface SerializedPlatform {
  name: string;
  position: [number, number, number];
  dimensions: [number, number, number];
  materialPreset: MaterialPreset;
}

export interface SerializedGameplayEntity {
  type: 'collectible' | 'hazard' | 'jump_pad' | 'moving_platform' | 'speed_ring' | 'goal';
  position: [number, number, number];
  data?: any;
}

export interface LevelPackage {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  lightingPreset: LightingPreset;
  backgroundColor: number;
  platforms: SerializedPlatform[];
  entities: SerializedGameplayEntity[];
}

const STORAGE_KEY = 'codex3d_saved_levels';

export class LevelSerializer {
  constructor(private engine: StudioEngine) {}

  public serialize(title = 'Custom Level'): LevelPackage {
    const platforms: SerializedPlatform[] = [];
    const meshes = this.engine.meshes.getObjects();

    for (const mesh of meshes) {
      if (mesh.userData?.isStudioAsset && !mesh.userData?.gameplayType) {
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        const width = bbox ? (bbox.max.x - bbox.min.x) * mesh.scale.x : 2;
        const height = bbox ? (bbox.max.y - bbox.min.y) * mesh.scale.y : 1;
        const depth = bbox ? (bbox.max.z - bbox.min.z) * mesh.scale.z : 2;

        platforms.push({
          name: mesh.name,
          position: [mesh.position.x, mesh.position.y, mesh.position.z],
          dimensions: [width, height, depth],
          materialPreset: (mesh.userData?.materialPreset as MaterialPreset) || 'carbon_fiber'
        });
      }
    }

    const entities: SerializedGameplayEntity[] = [];
    for (const item of this.engine.game.mechanics.items) {
      entities.push({
        type: item.type as any,
        position: [item.mesh.position.x, item.mesh.position.y, item.mesh.position.z],
        data: item.data ? {
          points: item.data.points,
          boostForce: item.data.boostForce,
          speed: item.data.speed,
          dimensions: item.data.dimensions
        } : {}
      });
    }

    const bg = this.engine.scene.background instanceof THREE.Color
      ? this.engine.scene.background.getHex()
      : 0x0a0b0e;

    return {
      id: `lvl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title,
      author: 'Creator',
      createdAt: new Date().toISOString(),
      lightingPreset: this.engine.lighting.currentPreset,
      backgroundColor: bg,
      platforms,
      entities
    };
  }

  public deserialize(pkg: LevelPackage): void {
    // 1. Clear current scene
    const objects = this.engine.meshes.getObjects();
    objects.forEach(o => this.engine.scene.remove(o));
    
    this.engine.game.mechanics.items.forEach(i => {
      this.engine.scene.remove(i.mesh);
      if (i.body) this.engine.game.physics.world.removeBody(i.body);
    });
    this.engine.game.mechanics.items = [];
    this.engine.game.physics.clearColliders();
    this.engine.selectObject(null);

    // 2. Set environment
    this.engine.setLightingPreset(pkg.lightingPreset || 'cyber_sunset');
    this.engine.scene.background = new THREE.Color(pkg.backgroundColor || 0x0a0b0e);

    // 3. Rebuild platforms
    for (const plat of pkg.platforms) {
      this.engine.meshes.createPrimitive({
        type: 'box',
        name: plat.name,
        dimensions: {
          width: plat.dimensions[0],
          height: plat.dimensions[1],
          depth: plat.dimensions[2]
        },
        position: plat.position,
        materialPreset: plat.materialPreset
      });
    }

    // 4. Rebuild entities
    for (const ent of pkg.entities) {
      if (ent.type === 'collectible') {
        this.engine.game.mechanics.spawnCollectible(ent.position, ent.data?.points || 100);
      } else if (ent.type === 'jump_pad') {
        this.engine.game.mechanics.spawnJumpPad(ent.position, ent.data?.boostForce || 22);
      } else if (ent.type === 'speed_ring') {
        this.engine.game.mechanics.spawnSpeedRing(ent.position);
      } else if (ent.type === 'hazard') {
        this.engine.game.mechanics.spawnHazard(ent.position, ent.data?.dimensions || [3, 0.3, 3]);
      } else if (ent.type === 'moving_platform') {
        const start = ent.position;
        const end: [number, number, number] = [start[0] + 5, start[1], start[2]];
        this.engine.game.mechanics.spawnMovingPlatform(start, end, ent.data?.dimensions || [3, 0.5, 2.5], ent.data?.speed || 1.8);
      } else if (ent.type === 'goal') {
        this.engine.game.mechanics.spawnGoal(ent.position);
      }
    }

    // 5. Reset player
    this.engine.game.controller.respawn(new THREE.Vector3(0, 1.5, 0));
    this.engine.game.mechanics.activeCheckpoint = new THREE.Vector3(0, 1.5, 0);
    this.engine.notifyChange();
  }

  public saveToStorage(pkg: LevelPackage): void {
    const list = this.listStorage();
    const existingIdx = list.findIndex(l => l.id === pkg.id);
    if (existingIdx >= 0) {
      list[existingIdx] = pkg;
    } else {
      list.unshift(pkg);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  public listStorage(): LevelPackage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public deleteFromStorage(id: string): void {
    const list = this.listStorage().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  public downloadJSON(pkg: LevelPackage): void {
    const jsonStr = JSON.stringify(pkg, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pkg.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.codex3d.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
