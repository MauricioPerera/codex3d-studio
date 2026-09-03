import * as THREE from 'three';
import { StudioEngine } from '../engine/StudioEngine';
import { MaterialPreset, LightingPreset } from '../engine/types';

export interface LevelGenerationOptions {
  prompt: string;
  theme?: 'cyber_neon' | 'dungeon' | 'sunset' | 'minimalist';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GeneratedLevelMetadata {
  title: string;
  description: string;
  platformCount: number;
  gemsCount: number;
  jumpPadsCount: number;
  speedRingsCount: number;
  hasMovingPlatforms: boolean;
  hasLavaFloor: boolean;
}

export class LevelGeneratorAI {
  constructor(private engine: StudioEngine) {}

  public async generateFromPrompt(options: LevelGenerationOptions): Promise<GeneratedLevelMetadata> {
    const prompt = options.prompt.toLowerCase();
    
    // 1. Clear existing scene objects & mechanics
    this.clearCurrentScene();

    // 2. Determine semantic intent
    const isSpiral = prompt.includes('espiral') || prompt.includes('spiral') || prompt.includes('helix') || prompt.includes('caracol') || prompt.includes('torre');
    const isSpeedway = prompt.includes('carrera') || prompt.includes('speedway') || prompt.includes('pista') || prompt.includes('recta') || prompt.includes('turbo') || prompt.includes('fast');
    const isZigzag = prompt.includes('zigzag') || prompt.includes('zig zag') || prompt.includes('curvas') || prompt.includes('angulos');
    const isArena = prompt.includes('arena') || prompt.includes('coliseo') || prompt.includes('circular') || prompt.includes('anillo');

    const wantsLava = prompt.includes('lava') || prompt.includes('fuego') || prompt.includes('peligro') || prompt.includes('hazard') || !prompt.includes('no lava');
    const wantsTurbo = prompt.includes('turbo') || prompt.includes('anillo') || prompt.includes('speed') || prompt.includes('ring') || isSpeedway;
    const wantsJumpPads = prompt.includes('trampolin') || prompt.includes('jump') || prompt.includes('salto') || prompt.includes('pad') || prompt.includes('alto');
    const wantsMoving = prompt.includes('movil') || prompt.includes('moving') || prompt.includes('puente') || prompt.includes('dinamico');

    // Theme detection
    let theme = options.theme;
    if (!theme) {
      if (prompt.includes('dungeon') || prompt.includes('medieval') || prompt.includes('castillo') || prompt.includes('piedra')) {
        theme = 'dungeon';
      } else if (prompt.includes('sunset') || prompt.includes('atardecer') || prompt.includes('naranja') || prompt.includes('retro')) {
        theme = 'sunset';
      } else if (prompt.includes('minimal') || prompt.includes('blanco') || prompt.includes('clean') || prompt.includes('estudio')) {
        theme = 'minimalist';
      } else {
        theme = 'cyber_neon';
      }
    }

    // Material palette based on theme
    let platformMaterial: MaterialPreset = 'carbon_fiber';
    let lightingPreset: LightingPreset = 'cyber_sunset';
    let groundColor = 0x05070d;

    if (theme === 'dungeon') {
      platformMaterial = 'matte_obsidian';
      lightingPreset = 'warm_editorial';
      groundColor = 0x120e0a;
    } else if (theme === 'sunset') {
      platformMaterial = 'terracotta';
      lightingPreset = 'cyber_sunset';
      groundColor = 0x1a0f0a;
    } else if (theme === 'minimalist') {
      platformMaterial = 'ceramic_white';
      lightingPreset = 'studio_high_key';
      groundColor = 0x1e293b;
    }

    this.engine.setLightingPreset(lightingPreset);
    this.engine.scene.background = new THREE.Color(groundColor);

    // Platform step count
    let stepCount = 10;
    if (prompt.includes('corto') || prompt.includes('short') || prompt.includes('rapido') || options.difficulty === 'easy') {
      stepCount = 7;
    } else if (prompt.includes('largo') || prompt.includes('long') || prompt.includes('extremo') || options.difficulty === 'hard') {
      stepCount = 14;
    }

    // 3. Procedural Pattern Builders
    let metadata: GeneratedLevelMetadata;

    if (isSpiral) {
      metadata = this.buildSpiralLevel(stepCount, platformMaterial, wantsLava, wantsTurbo, wantsJumpPads);
    } else if (isSpeedway) {
      metadata = this.buildSpeedwayLevel(stepCount, platformMaterial, wantsLava, wantsJumpPads);
    } else if (isZigzag) {
      metadata = this.buildZigzagLevel(stepCount, platformMaterial, wantsLava, wantsTurbo, wantsMoving);
    } else if (isArena) {
      metadata = this.buildArenaLevel(platformMaterial, wantsLava, wantsTurbo, wantsJumpPads);
    } else {
      metadata = this.buildLinearObbyLevel(stepCount, platformMaterial, wantsLava, wantsTurbo, wantsJumpPads, wantsMoving);
    }

    // 4. Reset & Align Player
    this.engine.game.controller.respawn(new THREE.Vector3(0, 1.5, 0));
    this.engine.game.mechanics.activeCheckpoint = new THREE.Vector3(0, 1.5, 0);
    this.engine.notifyChange();

    return metadata;
  }

  private clearCurrentScene() {
    // Remove all studio primitives
    const objects = this.engine.meshes.getObjects();
    objects.forEach(obj => {
      this.engine.scene.remove(obj);
    });
    // Remove all gameplay mechanics items
    this.engine.game.mechanics.items.forEach(item => {
      this.engine.scene.remove(item.mesh);
      if (item.body) {
        this.engine.game.physics.world.removeBody(item.body);
      }
    });
    this.engine.game.mechanics.items = [];
    this.engine.game.physics.clearColliders();
    this.engine.selectObject(null);
  }

  // PATTERN 1: Spiral Ascent Tower
  private buildSpiralLevel(
    steps: number,
    material: MaterialPreset,
    hasLava: boolean,
    hasTurbo: boolean,
    hasJumpPads: boolean
  ): GeneratedLevelMetadata {
    // Start island
    this.createPlatform([0, 0, 0], [4.5, 0.8, 4.5], material);

    let gemsCount = 0;
    let jumpPadsCount = 0;
    let speedRingsCount = 0;

    const radius = 6.5;
    let currentPos = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2.5;
      const x = Math.sin(angle) * radius;
      const y = (i + 1) * 1.3;
      const z = Math.cos(angle) * radius;
      currentPos.set(x, y, z);

      this.createPlatform([x, y, z], [2.8, 0.6, 2.8], material);

      // Distribute items
      if (i % 2 === 0) {
        this.engine.game.mechanics.spawnCollectible([x, y + 1.2, z], 100);
        gemsCount++;
      } else if (hasJumpPads && i === 3) {
        this.engine.game.mechanics.spawnJumpPad([x, y + 0.35, z], 20.0);
        jumpPadsCount++;
      } else if (hasTurbo && i === 5) {
        this.engine.game.mechanics.spawnSpeedRing([x, y + 1.2, z]);
        speedRingsCount++;
      }
    }

    // Climax Goal Platform on top
    const goalY = (steps + 1) * 1.3;
    this.createPlatform([0, goalY, 0], [5.0, 0.8, 5.0], material);
    this.engine.game.mechanics.spawnGoal([0, goalY + 1.2, 0]);

    // Lava Floor
    if (hasLava) {
      this.engine.game.mechanics.spawnHazard([0, -1.2, 0], [40, 0.5, 40]);
    }

    return {
      title: 'Spiral Ascent Tower',
      description: 'Una torre helicoidal que asciende en espiral hacia un portal en las nubes.',
      platformCount: steps + 2,
      gemsCount,
      jumpPadsCount,
      speedRingsCount,
      hasMovingPlatforms: false,
      hasLavaFloor: hasLava
    };
  }

  // PATTERN 2: Speedway Turbo Circuit
  private buildSpeedwayLevel(
    steps: number,
    material: MaterialPreset,
    hasLava: boolean,
    hasJumpPads: boolean
  ): GeneratedLevelMetadata {
    // Long runway with alternating jump ramps and speed rings
    this.createPlatform([0, 0, 0], [5.0, 0.8, 6.0], material);

    let gemsCount = 0;
    let jumpPadsCount = 0;
    let speedRingsCount = 0;
    let z = 0;

    for (let i = 0; i < steps; i++) {
      z += 6.5;
      const y = Math.sin(i * 0.8) * 1.2;
      this.createPlatform([0, y, z], [3.5, 0.6, 5.0], material);

      if (i % 2 === 0) {
        this.engine.game.mechanics.spawnSpeedRing([0, y + 1.2, z]);
        speedRingsCount++;
      } else {
        this.engine.game.mechanics.spawnCollectible([0, y + 1.2, z], 150);
        gemsCount++;
      }

      if (hasJumpPads && i === Math.floor(steps / 2)) {
        this.engine.game.mechanics.spawnJumpPad([0, y + 0.35, z], 24.0);
        jumpPadsCount++;
      }
    }

    // Final Victory Platform
    z += 8.0;
    this.createPlatform([0, 1.5, z], [6.0, 0.8, 6.0], material);
    this.engine.game.mechanics.spawnGoal([0, 2.7, z]);

    if (hasLava) {
      this.engine.game.mechanics.spawnHazard([0, -2.0, z / 2], [25, 0.5, z + 20]);
    }

    return {
      title: 'Speedway Turbo Dash',
      description: 'Pista recta de aceleración supersónica con anillos de turbo y saltos de alta velocidad.',
      platformCount: steps + 2,
      gemsCount,
      jumpPadsCount,
      speedRingsCount,
      hasMovingPlatforms: false,
      hasLavaFloor: hasLava
    };
  }

  // PATTERN 3: Zigzag Precision Parkour
  private buildZigzagLevel(
    steps: number,
    material: MaterialPreset,
    hasLava: boolean,
    hasTurbo: boolean,
    hasMoving: boolean
  ): GeneratedLevelMetadata {
    this.createPlatform([0, 0, 0], [4.0, 0.8, 4.0], material);

    let gemsCount = 0;
    let speedRingsCount = 0;
    let x = 0;
    let z = 0;
    let y = 0;

    for (let i = 0; i < steps; i++) {
      const dir = (i % 2 === 0) ? 1 : -1;
      x += dir * 4.5;
      z += 4.5;
      y += 0.5;

      if (hasMoving && i === 3) {
        const startPos: [number, number, number] = [x - 2, y, z];
        const endPos: [number, number, number] = [x + 2, y, z];
        this.engine.game.mechanics.spawnMovingPlatform(startPos, endPos, [3, 0.5, 2.5], 2.0);
      } else {
        this.createPlatform([x, y, z], [2.8, 0.6, 2.8], material);
      }

      if (i % 2 === 0) {
        this.engine.game.mechanics.spawnCollectible([x, y + 1.2, z], 100);
        gemsCount++;
      } else if (hasTurbo && i === 4) {
        this.engine.game.mechanics.spawnSpeedRing([x, y + 1.2, z]);
        speedRingsCount++;
      }
    }

    // Final Platform
    z += 5.5;
    this.createPlatform([x, y + 0.5, z], [5.0, 0.8, 5.0], material);
    this.engine.game.mechanics.spawnGoal([x, y + 1.7, z]);

    if (hasLava) {
      this.engine.game.mechanics.spawnHazard([0, -1.8, z / 2], [30, 0.5, z + 20]);
    }

    return {
      title: 'Zigzag Agility Course',
      description: 'Circuito de saltos con ángulos cerrados y cambios de dirección para probar tu precisión.',
      platformCount: steps + 2,
      gemsCount,
      jumpPadsCount: 0,
      speedRingsCount,
      hasMovingPlatforms: hasMoving,
      hasLavaFloor: hasLava
    };
  }

  // PATTERN 4: Circular Colosseum Arena
  private buildArenaLevel(
    material: MaterialPreset,
    hasLava: boolean,
    hasTurbo: boolean,
    hasJumpPads: boolean
  ): GeneratedLevelMetadata {
    // Central Hub
    this.createPlatform([0, 0, 0], [7.0, 0.8, 7.0], material);

    let gemsCount = 0;
    let jumpPadsCount = 0;
    let speedRingsCount = 0;

    // 4 Outer Pillar Towers with jump pads
    const offsets = [
      { x: 8, z: 0 },
      { x: -8, z: 0 },
      { x: 0, z: 8 },
      { x: 0, z: -8 }
    ];

    offsets.forEach((off, idx) => {
      this.createPlatform([off.x, 3.0, off.z], [3.5, 0.8, 3.5], material);
      this.engine.game.mechanics.spawnCollectible([off.x, 4.2, off.z], 200);
      gemsCount++;

      if (hasJumpPads) {
        // Jump pad near center pushing to pillar
        const padX = off.x * 0.45;
        const padZ = off.z * 0.45;
        this.engine.game.mechanics.spawnJumpPad([padX, 0.4, padZ], 18.0);
        jumpPadsCount++;
      }

      if (hasTurbo && idx % 2 === 0) {
        this.engine.game.mechanics.spawnSpeedRing([off.x * 0.7, 2.0, off.z * 0.7]);
        speedRingsCount++;
      }
    });

    // High Center Floating Goal Stargate
    this.createPlatform([0, 7.5, 0], [4.0, 0.6, 4.0], material);
    this.engine.game.mechanics.spawnGoal([0, 8.7, 0]);

    // High Bounce central super pad
    this.engine.game.mechanics.spawnJumpPad([0, 0.4, 0], 28.0);
    jumpPadsCount++;

    if (hasLava) {
      this.engine.game.mechanics.spawnHazard([0, -1.5, 0], [35, 0.5, 35]);
    }

    return {
      title: 'Colosseum Bounce Arena',
      description: 'Arena circular de cuatro torres con trampolines de alto impulso y un portal central suspendido.',
      platformCount: 6,
      gemsCount,
      jumpPadsCount,
      speedRingsCount,
      hasMovingPlatforms: false,
      hasLavaFloor: hasLava
    };
  }

  // PATTERN 5: Classic Linear Obby Course
  private buildLinearObbyLevel(
    steps: number,
    material: MaterialPreset,
    hasLava: boolean,
    hasTurbo: boolean,
    hasJumpPads: boolean,
    hasMoving: boolean
  ): GeneratedLevelMetadata {
    this.createPlatform([0, 0, 0], [4.5, 0.8, 4.5], material);

    let gemsCount = 0;
    let jumpPadsCount = 0;
    let speedRingsCount = 0;
    let z = 0;
    let y = 0;

    for (let i = 0; i < steps; i++) {
      z += 4.5 + (i % 3 === 0 ? 1.0 : 0);
      y += (i % 2 === 0 ? 0.6 : -0.2);
      const x = Math.sin(i * 1.5) * 2.2;

      if (hasMoving && i === 2) {
        const startPos: [number, number, number] = [x - 2, y, z];
        const endPos: [number, number, number] = [x + 2, y, z];
        this.engine.game.mechanics.spawnMovingPlatform(startPos, endPos, [3, 0.5, 2.5], 1.8);
      } else {
        this.createPlatform([x, y, z], [3.0, 0.6, 3.0], material);
      }

      if (i % 2 === 0) {
        this.engine.game.mechanics.spawnCollectible([x, y + 1.2, z], 100);
        gemsCount++;
      } else if (hasTurbo && i === 4) {
        this.engine.game.mechanics.spawnSpeedRing([x, y + 1.2, z]);
        speedRingsCount++;
      } else if (hasJumpPads && i === 6) {
        this.engine.game.mechanics.spawnJumpPad([x, y + 0.35, z], 20.0);
        jumpPadsCount++;
      }
    }

    z += 6.0;
    this.createPlatform([0, y + 0.8, z], [5.5, 0.8, 5.5], material);
    this.engine.game.mechanics.spawnGoal([0, y + 2.0, z]);

    if (hasLava) {
      this.engine.game.mechanics.spawnHazard([0, -1.8, z / 2], [28, 0.5, z + 20]);
    }

    return {
      title: 'Neon Parkour Obby',
      description: 'Pistas flotantes de dificultad equilibrada con gemas, trampolines y portal de meta.',
      platformCount: steps + 2,
      gemsCount,
      jumpPadsCount,
      speedRingsCount,
      hasMovingPlatforms: hasMoving,
      hasLavaFloor: hasLava
    };
  }

  private createPlatform(
    position: [number, number, number],
    dimensions: [number, number, number],
    materialPreset: MaterialPreset
  ) {
    this.engine.meshes.createPrimitive({
      type: 'box',
      name: `Platform_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      dimensions: { width: dimensions[0], height: dimensions[1], depth: dimensions[2] },
      position,
      materialPreset
    });
  }
}
