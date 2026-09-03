import { StudioEngine } from '../engine/StudioEngine';
import { WebMCPBridge } from './WebMCPBridge';
import { 
  PrimitiveType, 
  CSGOperationType, 
  DeformerType, 
  MaterialPreset, 
  LightingPreset, 
  CameraPreset 
} from '../engine/types';

export function registerStudioTools(engine: StudioEngine): WebMCPBridge {
  const bridge = WebMCPBridge.getInstance();

  // 1. Create Primitive
  bridge.registerTool({
    name: 'create_primitive',
    description: 'Creates a 3D geometric primitive in the scene (box, sphere, cylinder, cone, torus, torus_knot, capsule, plane, ring, dodecahedron) with optional dimensions, transforms, and PBR material preset.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'torus_knot', 'capsule', 'plane', 'ring', 'dodecahedron'],
          description: 'Type of primitive geometry to create'
        },
        name: { type: 'string', description: 'Friendly name for the object in the scene tree' },
        dimensions: {
          type: 'object',
          description: 'Dimension properties (e.g. width, height, depth, radius, tube)'
        },
        position: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] position in 3D world space'
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] rotation angles in degrees'
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] scale multipliers'
        },
        materialPreset: {
          type: 'string',
          enum: ['brushed_gold', 'polished_chrome', 'matte_obsidian', 'frosted_glass', 'cyber_neon', 'terracotta', 'carbon_fiber', 'velvet_emerald', 'ceramic_white', 'metallic_copper', 'clay_sculpt'],
          description: 'PBR material preset to apply immediately'
        }
      },
      required: ['type']
    },
    execute: (args) => {
      const mesh = engine.meshes.createPrimitive({
        type: args.type as PrimitiveType,
        name: args.name,
        dimensions: args.dimensions,
        position: args.position,
        rotation: args.rotation,
        scale: args.scale,
        materialPreset: args.materialPreset as MaterialPreset
      });
      engine.notifyChange();
      return {
        id: mesh.userData.id,
        name: mesh.name,
        type: args.type,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        message: `Successfully created ${args.type} '${mesh.name}' with id ${mesh.userData.id}`
      };
    }
  });

  // 2. CSG Boolean Operation
  bridge.registerTool({
    name: 'csg_boolean',
    description: 'Performs solid boolean geometry operations (union, subtract, intersect) between two meshes. For example, subtract a cylinder from a box to cut a clean hole.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['union', 'subtract', 'intersect'],
          description: 'Boolean operation to execute'
        },
        targetAId: { type: 'string', description: 'ID of the primary mesh' },
        targetBId: { type: 'string', description: 'ID of the modifier/cutting mesh' },
        name: { type: 'string', description: 'Name for the resulting compound mesh' },
        keepOriginals: { type: 'boolean', description: 'Whether to keep original operands in scene (default false)' },
        materialPreset: {
          type: 'string',
          enum: ['brushed_gold', 'polished_chrome', 'matte_obsidian', 'frosted_glass', 'cyber_neon', 'terracotta', 'carbon_fiber', 'velvet_emerald', 'ceramic_white', 'metallic_copper', 'clay_sculpt']
        }
      },
      required: ['operation', 'targetAId', 'targetBId']
    },
    execute: (args) => {
      const resultMesh = engine.meshes.csgOperation({
        operation: args.operation as CSGOperationType,
        targetAId: args.targetAId,
        targetBId: args.targetBId,
        name: args.name,
        keepOriginals: args.keepOriginals,
        materialPreset: args.materialPreset as MaterialPreset
      });
      engine.notifyChange();
      return {
        id: resultMesh.userData.id,
        name: resultMesh.name,
        operation: args.operation,
        polyCount: resultMesh.geometry.attributes.position ? Math.round(resultMesh.geometry.attributes.position.count / 3) : 0,
        message: `CSG ${args.operation} completed. Created ${resultMesh.name}`
      };
    }
  });

  // 3. Extruded 2D Shape
  bridge.registerTool({
    name: 'create_extruded_shape',
    description: 'Generates a 3D extruded model from a 2D profile (star, gear, polygon, or custom 2D coordinate points) with controllable depth, bevels, and chamfers.',
    parameters: {
      type: 'object',
      properties: {
        shapeType: {
          type: 'string',
          enum: ['star', 'gear', 'polygon', 'custom'],
          description: 'Preset 2D profile or custom points'
        },
        points: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          },
          description: 'Array of [x, y] points for custom shape'
        },
        depth: { type: 'number', description: 'Extrusion depth along Z/Y (default 0.4)' },
        bevelEnabled: { type: 'boolean', description: 'Enable edge chamfer/bevel (default true)' },
        bevelThickness: { type: 'number', description: 'Bevel thickness (default 0.05)' },
        name: { type: 'string', description: 'Name for the extruded object' },
        materialPreset: { type: 'string', description: 'Material preset' }
      }
    },
    execute: (args) => {
      const mesh = engine.meshes.createExtrudedShape({
        shapeType: args.shapeType || 'star',
        points: args.points,
        depth: args.depth,
        bevelEnabled: args.bevelEnabled,
        bevelThickness: args.bevelThickness,
        name: args.name,
        materialPreset: args.materialPreset as MaterialPreset
      });
      engine.notifyChange();
      return {
        id: mesh.userData.id,
        name: mesh.name,
        message: `Created extruded ${args.shapeType || 'star'} with id ${mesh.userData.id}`
      };
    }
  });

  // 4. Parametric Compound Asset
  bridge.registerTool({
    name: 'create_parametric_asset',
    description: 'Creates a complex procedural model using compound CSG, lathe, and beveled geometry (coffee_mug, wine_glass, pedestal, studio_lamp, sci_fi_crate).',
    parameters: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          enum: ['coffee_mug', 'wine_glass', 'pedestal', 'studio_lamp', 'sci_fi_crate'],
          description: 'The procedural model template'
        },
        name: { type: 'string', description: 'Custom name for the asset' },
        position: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] position'
        },
        materialPreset: {
          type: 'string',
          enum: ['brushed_gold', 'polished_chrome', 'matte_obsidian', 'frosted_glass', 'cyber_neon', 'terracotta', 'carbon_fiber', 'velvet_emerald', 'ceramic_white', 'metallic_copper', 'clay_sculpt']
        }
      },
      required: ['template']
    },
    execute: (args) => {
      const mesh = engine.meshes.createParametricAsset({
        template: args.template,
        name: args.name,
        position: args.position,
        materialPreset: args.materialPreset as MaterialPreset
      });
      engine.notifyChange();
      return {
        id: mesh.userData.id,
        name: mesh.name,
        template: args.template,
        message: `Procedural asset ${args.template} successfully generated as '${mesh.name}'`
      };
    }
  });

  // 5. Modify Transform
  bridge.registerTool({
    name: 'modify_transform',
    description: 'Moves, rotates, scales, aligns an object to the studio ground (y=0), or centers its origin.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'ID of the object to modify' },
        position: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] target world position'
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] rotation angles in degrees'
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y, z] scale multipliers or single number'
        },
        alignToGround: {
          type: 'boolean',
          description: 'If true, automatically adjusts Y position so bottom sits flush on ground plane'
        },
        centerOrigin: {
          type: 'boolean',
          description: 'If true, re-centers geometry bounding box origin to (0,0,0)'
        }
      },
      required: ['objectId']
    },
    execute: (args) => {
      engine.meshes.modifyTransform({
        objectId: args.objectId,
        transform: {
          position: args.position,
          rotation: args.rotation,
          scale: args.scale,
          alignToGround: args.alignToGround,
          centerOrigin: args.centerOrigin
        }
      });
      engine.notifyChange();
      const obj = engine.meshes.getObjectById(args.objectId);
      return {
        objectId: args.objectId,
        newPosition: obj ? [obj.position.x, obj.position.y, obj.position.z] : null,
        message: `Transform updated for ${args.objectId}`
      };
    }
  });

  // 6. Apply Material
  bridge.registerTool({
    name: 'apply_material',
    description: 'Applies studio PBR materials with physical properties (roughness, metalness, clearcoat, glass transmission, emission, procedural textures) or studio presets.',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Target object ID' },
        preset: {
          type: 'string',
          enum: ['brushed_gold', 'polished_chrome', 'matte_obsidian', 'frosted_glass', 'cyber_neon', 'terracotta', 'carbon_fiber', 'velvet_emerald', 'ceramic_white', 'metallic_copper', 'clay_sculpt'],
          description: 'Curated studio preset'
        },
        color: { type: 'string', description: 'Hex color string (e.g. #38bdf8)' },
        roughness: { type: 'number', minimum: 0, maximum: 1 },
        metalness: { type: 'number', minimum: 0, maximum: 1 },
        clearcoat: { type: 'number', minimum: 0, maximum: 1 },
        transmission: { type: 'number', minimum: 0, maximum: 1, description: 'Glass refraction/transparency' },
        emissive: { type: 'string', description: 'Glow emissive color hex' },
        emissiveIntensity: { type: 'number', minimum: 0, maximum: 10 },
        proceduralTexture: {
          type: 'string',
          enum: ['none', 'grid', 'checker', 'carbon']
        }
      },
      required: ['objectId']
    },
    execute: (args) => {
      const obj = engine.meshes.getObjectById(args.objectId);
      if (!obj) throw new Error(`Object ${args.objectId} not found`);

      engine.materials.applyToMesh(
        obj,
        {
          color: args.color,
          roughness: args.roughness,
          metalness: args.metalness,
          clearcoat: args.clearcoat,
          transmission: args.transmission,
          emissive: args.emissive,
          emissiveIntensity: args.emissiveIntensity,
          proceduralTexture: args.proceduralTexture
        },
        args.preset as MaterialPreset
      );
      engine.notifyChange();
      return {
        objectId: args.objectId,
        material: args.preset || 'custom_pbr',
        message: `Material applied to ${obj.name}`
      };
    }
  });

  // 7. Apply Deformer
  bridge.registerTool({
    name: 'apply_deformer',
    description: 'Deforms mesh geometry with parametric algorithms: taper (flare/pinch), twist (spiral), bend (curve along arc), or noise (organic surface ripple).',
    parameters: {
      type: 'object',
      properties: {
        objectId: { type: 'string', description: 'Target mesh ID' },
        deformer: {
          type: 'string',
          enum: ['taper', 'twist', 'bend', 'noise'],
          description: 'Deformation algorithm'
        },
        factor: { type: 'number', description: 'Strength/intensity of the deformation (e.g. 0.5 to 2.0)' }
      },
      required: ['objectId', 'deformer']
    },
    execute: (args) => {
      engine.meshes.applyDeformer({
        objectId: args.objectId,
        deformer: args.deformer as DeformerType,
        factor: args.factor ?? 1.0
      });
      engine.notifyChange();
      return {
        objectId: args.objectId,
        deformer: args.deformer,
        factor: args.factor ?? 1.0,
        message: `Applied ${args.deformer} deformer to ${args.objectId}`
      };
    }
  });

  // 8. Compose Scene
  bridge.registerTool({
    name: 'compose_scene',
    description: 'Adjusts studio atmosphere, lighting presets (studio_high_key, cinematic_noir, cyber_sunset, warm_editorial, minimal_clay), grid, and shadow catcher ground.',
    parameters: {
      type: 'object',
      properties: {
        lightingPreset: {
          type: 'string',
          enum: ['studio_high_key', 'cinematic_noir', 'cyber_sunset', 'warm_editorial', 'minimal_clay'],
          description: 'Studio lighting style'
        },
        showGrid: { type: 'boolean', description: 'Toggle reference floor grid' },
        showGround: { type: 'boolean', description: 'Toggle shadow-catcher ground plane' }
      }
    },
    execute: (args) => {
      if (args.lightingPreset) {
        engine.setLightingPreset(args.lightingPreset as LightingPreset);
      }
      if (args.showGrid !== undefined) {
        engine.lighting.toggleGrid(args.showGrid);
      }
      if (args.showGround !== undefined) {
        engine.lighting.toggleGround(args.showGround);
      }
      engine.notifyChange();
      return {
        activePreset: engine.lighting.currentPreset,
        gridVisible: engine.lighting.gridHelper.visible,
        groundVisible: engine.lighting.groundPlane.visible,
        message: 'Scene composition updated'
      };
    }
  });

  // 9. Set Camera
  bridge.registerTool({
    name: 'set_camera',
    description: 'Controls viewport camera framing, targeting specific objects, framing the entire scene, or switching to standard studio angles (three_quarter, front, top, side, isometric, hero_low, close_up).',
    parameters: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['three_quarter', 'front', 'top', 'side', 'isometric', 'hero_low', 'close_up'],
          description: 'Camera angle preset'
        },
        targetObjectId: { type: 'string', description: 'Optional object ID to center camera target upon' },
        frameAll: { type: 'boolean', description: 'Auto-frame bounding sphere of all objects' },
        turntable: { type: 'boolean', description: 'Enable or disable 360 turntable auto-rotation' }
      }
    },
    execute: (args) => {
      if (args.frameAll) {
        engine.frameAll();
      } else if (args.preset) {
        engine.setCameraPreset(args.preset as CameraPreset, args.targetObjectId);
      }
      if (args.turntable !== undefined) {
        engine.toggleTurntable(args.turntable);
      }
      engine.notifyChange();
      return {
        cameraPosition: [engine.camera.position.x, engine.camera.position.y, engine.camera.position.z],
        cameraTarget: [engine.controls.target.x, engine.controls.target.y, engine.controls.target.z],
        turntable: engine.getTurntableState(),
        message: 'Camera updated successfully'
      };
    }
  });

  // 10. Render Asset (Snapshot)
  bridge.registerTool({
    name: 'render_asset',
    description: 'Produces a studio-grade high-resolution PNG snapshot of the asset or scene, with transparent background option and custom resolution.',
    parameters: {
      type: 'object',
      properties: {
        width: { type: 'number', description: 'Output pixel width (default 1200)' },
        height: { type: 'number', description: 'Output pixel height (default 1200)' },
        transparent: { type: 'boolean', description: 'Transparent alpha background for clean asset cutout' },
        cameraPreset: {
          type: 'string',
          enum: ['three_quarter', 'front', 'top', 'side', 'isometric', 'hero_low', 'close_up']
        },
        targetObjectId: { type: 'string', description: 'Specific object to focus framing on' }
      }
    },
    execute: (args) => {
      if (args.cameraPreset) {
        engine.setCameraPreset(args.cameraPreset as CameraPreset, args.targetObjectId);
      }
      const dataUrl = engine.exporter.renderSnapshot({
        width: args.width || 1200,
        height: args.height || 1200,
        transparent: args.transparent ?? false
      });
      return {
        dataUrl,
        resolution: `${args.width || 1200}x${args.height || 1200}`,
        transparent: args.transparent ?? false,
        message: 'Render snapshot completed successfully'
      };
    }
  });

  // 11. Export Model
  bridge.registerTool({
    name: 'export_model',
    description: 'Exports the scene models to glTF binary (.glb) or Wavefront (.obj) format and triggers browser download.',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['glb', 'obj'],
          description: 'Export file format'
        },
        fileName: { type: 'string', description: 'Target file name (e.g. asset.glb)' }
      },
      required: ['format']
    },
    execute: async (args) => {
      const fileName = args.fileName || `model_${Date.now()}.${args.format}`;
      if (args.format === 'glb') {
        const { blob, size } = await engine.exporter.exportGLB(undefined, fileName);
        engine.exporter.downloadFile(blob, fileName);
        return { format: 'glb', fileName, sizeBytes: size, message: `Exported ${fileName} (${size} bytes)` };
      } else {
        const { text, size } = engine.exporter.exportOBJ(undefined);
        engine.exporter.downloadFile(text, fileName);
        return { format: 'obj', fileName, sizeBytes: size, message: `Exported ${fileName} (${size} bytes)` };
      }
    }
  });

  // 12. Inspect Scene
  bridge.registerTool({
    name: 'inspect_scene',
    description: 'Returns complete structured telemetry of all objects in the scene, vertex counts, polygon counts, bounds, materials, and active lighting/camera settings.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: () => {
      return engine.inspectScene();
    }
  });

  // 13. Manage Objects
  bridge.registerTool({
    name: 'manage_objects',
    description: 'Performs object management tasks: delete an object, clear the entire scene, or duplicate an object.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['delete', 'clear', 'duplicate'],
          description: 'Action to perform'
        },
        objectId: { type: 'string', description: 'Target object ID (required for delete and duplicate)' }
      },
      required: ['action']
    },
    execute: (args) => {
      if (args.action === 'clear') {
        engine.meshes.clearScene();
        engine.notifyChange();
        return { action: 'clear', message: 'All scene objects removed' };
      } else if (args.action === 'delete') {
        if (!args.objectId) throw new Error('objectId is required for delete');
        const success = engine.meshes.deleteObject(args.objectId);
        engine.notifyChange();
        return { action: 'delete', objectId: args.objectId, success };
      } else if (args.action === 'duplicate') {
        if (!args.objectId) throw new Error('objectId is required for duplicate');
        const original = engine.meshes.getObjectById(args.objectId);
        if (!original) throw new Error(`Object ${args.objectId} not found`);
        const clone = original.clone();
        clone.position.x += 1.5;
        const newId = engine.meshes.generateId('dup');
        clone.name = `${original.name} (Copy)`;
        clone.userData = { id: newId, type: original.userData?.type || 'mesh', isStudioAsset: true };
        engine.scene.add(clone);
        (engine.meshes as any).objects.set(newId, clone);
        engine.notifyChange();
        return { action: 'duplicate', newId, name: clone.name };
      }
    }
  });

  // 14. Load Sample Template
  bridge.registerTool({
    name: 'load_sample_template',
    description: 'Loads a curated showcase composition (e.g. coffee_studio, mechanical_assembly, cyber_showcase).',
    parameters: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          enum: ['coffee_studio', 'cyber_showcase', 'sculpture_pedestal'],
          description: 'Template name'
        }
      },
      required: ['template']
    },
    execute: (args) => {
      engine.meshes.clearScene();

      if (args.template === 'coffee_studio') {
        engine.setLightingPreset('warm_editorial');
        // Pedestal base
        const pedestal = engine.meshes.createPrimitive({
          type: 'cylinder',
          name: 'Showcase Pedestal',
          dimensions: { radiusTop: 2.2, radiusBottom: 2.3, height: 0.35, radialSegments: 48 },
          position: [0, 0.175, 0],
          materialPreset: 'clay_sculpt'
        });
        // Coffee mug
        const mug = engine.meshes.createParametricAsset({
          template: 'coffee_mug',
          name: 'Designer Ceramic Mug',
          position: [0, 0.35, 0],
          materialPreset: 'ceramic_white'
        });
        engine.frameAll();
      } else if (args.template === 'cyber_showcase') {
        engine.setLightingPreset('cyber_sunset');
        // Sci-fi crate
        const crate = engine.meshes.createParametricAsset({
          template: 'sci_fi_crate',
          name: 'Obsidian Data Crate',
          position: [0, 0, 0],
          materialPreset: 'carbon_fiber'
        });
        // Floating cyber torus knot
        const knot = engine.meshes.createPrimitive({
          type: 'torus_knot',
          name: 'Neon Quantum Core',
          dimensions: { radius: 0.7, tube: 0.2, tubularSegments: 96, radialSegments: 24, p: 2, q: 3 },
          position: [0, 2.6, 0],
          materialPreset: 'cyber_neon'
        });
        engine.frameAll();
      } else {
        // sculpture_pedestal
        engine.setLightingPreset('studio_high_key');
        const ped = engine.meshes.createParametricAsset({
          template: 'pedestal',
          name: 'Gallery Plinth',
          position: [0, 0, 0],
          materialPreset: 'clay_sculpt'
        });
        const sculpture = engine.meshes.createPrimitive({
          type: 'dodecahedron',
          name: 'Golden Monolith',
          dimensions: { radius: 0.8 },
          position: [0, 2.7, 0],
          materialPreset: 'brushed_gold'
        });
        engine.meshes.applyDeformer({
          objectId: sculpture.userData.id,
          deformer: 'twist',
          factor: 0.8
        });
        engine.frameAll();
      }

      engine.notifyChange();
      return {
        template: args.template,
        objectCount: engine.meshes.getObjects().length,
        message: `Loaded template ${args.template}`
      };
    }
  });

  // 15. Capture Photoreal Conditioning (Color + Depth Map + Telemetry)
  bridge.registerTool({
    name: 'capture_photoreal_conditioning',
    description: 'Captures a clean high-fidelity conditioning bundle for AI photorealistic image synthesis: beauty color pass, ControlNet depth map pass, ControlNet normal map pass, exact camera telemetry (pitch degrees, yaw, distance, FOV), and pre-built architectural prompt.',
    parameters: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: ['golden_hour', 'crisp_daylight', 'blue_hour', 'moody_rain'],
          description: 'Atmospheric lighting style'
        },
        width: { type: 'number', description: 'Resolution width (default 1024)' },
        height: { type: 'number', description: 'Resolution height (default 1024)' }
      }
    },
    execute: (args) => {
      const bundle = engine.exporter.capturePhotorealConditioning({
        style: args.style || 'golden_hour',
        width: args.width || 1024,
        height: args.height || 1024
      });
      return {
        camera: bundle.camera,
        suggestedPrompt: bundle.suggestedPrompt,
        resolution: bundle.resolution,
        colorPassLength: bundle.colorPassUrl.length,
        depthPassLength: bundle.depthPassUrl.length,
        normalPassLength: bundle.normalPassUrl.length,
        colorPassUrl: bundle.colorPassUrl,
        depthPassUrl: bundle.depthPassUrl,
        normalPassUrl: bundle.normalPassUrl,
        message: `Captured conditioning bundle at ${bundle.camera.pitchDegrees}° camera pitch`
      };
    }
  });

  return bridge;
}

