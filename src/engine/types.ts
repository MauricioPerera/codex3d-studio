import * as THREE from 'three';

export type PrimitiveType = 
  | 'box' 
  | 'sphere' 
  | 'cylinder' 
  | 'cone' 
  | 'torus' 
  | 'torus_knot' 
  | 'capsule' 
  | 'plane' 
  | 'ring' 
  | 'dodecahedron';

export type CSGOperationType = 'union' | 'subtract' | 'intersect';

export type DeformerType = 'taper' | 'twist' | 'bend' | 'noise';

export type LightingPreset = 
  | 'studio_high_key' 
  | 'cinematic_noir' 
  | 'cyber_sunset' 
  | 'warm_editorial' 
  | 'minimal_clay';

export type CameraPreset = 
  | 'three_quarter' 
  | 'front' 
  | 'top' 
  | 'side' 
  | 'isometric' 
  | 'hero_low' 
  | 'close_up';

export type MaterialPreset = 
  | 'brushed_gold' 
  | 'polished_chrome' 
  | 'matte_obsidian' 
  | 'frosted_glass' 
  | 'cyber_neon' 
  | 'terracotta' 
  | 'carbon_fiber' 
  | 'velvet_emerald' 
  | 'ceramic_white' 
  | 'metallic_copper' 
  | 'clay_sculpt';

export interface PBRMaterialOptions {
  color?: string | number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  flatShading?: boolean;
  emissive?: string | number;
  emissiveIntensity?: number;
  proceduralTexture?: 'none' | 'grid' | 'checker' | 'carbon';
}

export interface ObjectTransformOptions {
  position?: [number, number, number];
  rotation?: [number, number, number]; // in degrees or radians
  scale?: [number, number, number] | number;
  alignToGround?: boolean;
  centerOrigin?: boolean;
}

export interface RenderSnapshotOptions {
  width?: number;
  height?: number;
  transparent?: boolean;
  cameraPreset?: CameraPreset;
  targetObjectId?: string;
}

export interface SceneObjectMeta {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  polyCount: number;
  vertexCount: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialName?: string;
  materialColor?: string;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
}

export interface SceneInspectionResult {
  objectCount: number;
  totalPolyCount: number;
  totalVertexCount: number;
  lightingPreset: LightingPreset;
  activeCameraPreset?: CameraPreset;
  objects: SceneObjectMeta[];
}

export interface WebMCPToolExecutionEvent {
  id: string;
  timestamp: number;
  tool: string;
  args: Record<string, any>;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  result?: any;
  error?: string;
}
