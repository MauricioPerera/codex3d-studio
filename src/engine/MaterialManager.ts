import * as THREE from 'three';
import { MaterialPreset, PBRMaterialOptions } from './types';

export class MaterialManager {
  private textures: Map<string, THREE.CanvasTexture> = new Map();
  private presetDefinitions: Map<MaterialPreset, PBRMaterialOptions> = new Map();

  constructor() {
    this.initPresets();
  }

  private initPresets() {
    this.presetDefinitions.set('brushed_gold', {
      color: '#e5b842',
      roughness: 0.28,
      metalness: 0.95,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1
    });

    this.presetDefinitions.set('polished_chrome', {
      color: '#e2e8f0',
      roughness: 0.05,
      metalness: 1.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05
    });

    this.presetDefinitions.set('matte_obsidian', {
      color: '#12141a',
      roughness: 0.35,
      metalness: 0.15,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25
    });

    this.presetDefinitions.set('frosted_glass', {
      color: '#dbeafe',
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.92,
      ior: 1.52,
      transparent: true,
      opacity: 0.85
    });

    this.presetDefinitions.set('cyber_neon', {
      color: '#06b6d4',
      emissive: '#06b6d4',
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
      clearcoat: 0.5
    });

    this.presetDefinitions.set('terracotta', {
      color: '#c25e3f',
      roughness: 0.85,
      metalness: 0.02,
      flatShading: false
    });

    this.presetDefinitions.set('carbon_fiber', {
      color: '#18191f',
      roughness: 0.4,
      metalness: 0.6,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      proceduralTexture: 'carbon'
    });

    this.presetDefinitions.set('velvet_emerald', {
      color: '#064e3b',
      roughness: 0.75,
      metalness: 0.1,
      clearcoat: 0.1
    });

    this.presetDefinitions.set('ceramic_white', {
      color: '#f8fafc',
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08
    });

    this.presetDefinitions.set('metallic_copper', {
      color: '#c86d51',
      roughness: 0.25,
      metalness: 0.9,
      clearcoat: 0.3
    });

    this.presetDefinitions.set('clay_sculpt', {
      color: '#a89f91',
      roughness: 0.92,
      metalness: 0.0,
      flatShading: false
    });
  }

  public getProceduralTexture(type: 'grid' | 'checker' | 'carbon'): THREE.CanvasTexture {
    if (this.textures.has(type)) {
      return this.textures.get(type)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    if (type === 'grid') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      const step = 32;
      for (let x = 0; x <= 256; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 0; y <= 256; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
    } else if (type === 'checker') {
      const size = 32;
      for (let y = 0; y < 256; y += size) {
        for (let x = 0; x < 256; x += size) {
          ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#f8fafc' : '#0f172a';
          ctx.fillRect(x, y, size, size);
        }
      }
    } else if (type === 'carbon') {
      ctx.fillStyle = '#111317';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#222630';
      const cell = 16;
      for (let y = 0; y < 256; y += cell) {
        for (let x = 0; x < 256; x += cell) {
          if ((x / cell + y / cell) % 2 === 0) {
            ctx.fillRect(x, y, cell, cell);
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.textures.set(type, texture);
    return texture;
  }

  public createMaterial(options: PBRMaterialOptions = {}, preset?: MaterialPreset): THREE.MeshPhysicalMaterial {
    const merged: PBRMaterialOptions = {
      color: '#94a3b8',
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.0,
      clearcoatRoughness: 0.1,
      transmission: 0.0,
      ior: 1.5,
      opacity: 1.0,
      transparent: false,
      wireframe: false,
      flatShading: false,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      ...(preset ? this.presetDefinitions.get(preset) : {}),
      ...options
    };

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(merged.color),
      roughness: merged.roughness ?? 0.4,
      metalness: merged.metalness ?? 0.1,
      clearcoat: merged.clearcoat ?? 0.0,
      clearcoatRoughness: merged.clearcoatRoughness ?? 0.1,
      transmission: merged.transmission ?? 0.0,
      ior: merged.ior ?? 1.5,
      opacity: merged.opacity ?? 1.0,
      transparent: merged.transparent ?? false,
      wireframe: merged.wireframe ?? false,
      flatShading: merged.flatShading ?? false,
      emissive: new THREE.Color(merged.emissive || '#000000'),
      emissiveIntensity: merged.emissiveIntensity ?? 0.0,
      envMapIntensity: 1.2
    });

    if (merged.proceduralTexture && merged.proceduralTexture !== 'none') {
      material.map = this.getProceduralTexture(merged.proceduralTexture);
    }

    material.name = preset || 'custom_pbr';
    return material;
  }

  public applyToMesh(mesh: THREE.Mesh, options: PBRMaterialOptions, preset?: MaterialPreset): void {
    const newMaterial = this.createMaterial(options, preset);
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
    mesh.material = newMaterial;
  }

  public getPresetsList(): Array<{ id: MaterialPreset; label: string; color: string }> {
    return [
      { id: 'brushed_gold', label: 'Brushed Gold', color: '#e5b842' },
      { id: 'polished_chrome', label: 'Polished Chrome', color: '#e2e8f0' },
      { id: 'matte_obsidian', label: 'Matte Obsidian', color: '#12141a' },
      { id: 'frosted_glass', label: 'Frosted Glass', color: '#93c5fd' },
      { id: 'cyber_neon', label: 'Cyber Neon', color: '#06b6d4' },
      { id: 'ceramic_white', label: 'Ceramic White', color: '#f8fafc' },
      { id: 'metallic_copper', label: 'Metallic Copper', color: '#c86d51' },
      { id: 'carbon_fiber', label: 'Carbon Fiber', color: '#1e293b' },
      { id: 'terracotta', label: 'Terracotta Clay', color: '#c25e3f' },
      { id: 'velvet_emerald', label: 'Velvet Emerald', color: '#064e3b' },
      { id: 'clay_sculpt', label: 'Clay Sculpt', color: '#a89f91' },
    ];
  }
}
