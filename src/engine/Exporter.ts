import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

export interface CameraPoseTelemetry {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  pitchDegrees: number; // 0 = eye level, 90 = top down
  yawDegrees: number;   // 0 = front, 90 = side
  fov: number;
  viewDescription: string;
}

export interface PhotorealConditioningBundle {
  colorPassUrl: string;
  depthPassUrl: string;
  normalPassUrl: string;
  camera: CameraPoseTelemetry;
  suggestedPrompt: string;
  resolution: string;
}

export class Exporter {
  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.PerspectiveCamera
  ) {}

  public async exportGLB(targetObject?: THREE.Object3D, fileName = 'model.glb'): Promise<{ blob: Blob; size: number }> {
    const exporter = new GLTFExporter();
    const input = targetObject || this.getExportableGroup();

    return new Promise((resolve, reject) => {
      exporter.parse(
        input,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          resolve({ blob, size: blob.size });
        },
        (error) => reject(error),
        { binary: true }
      );
    });
  }

  public exportOBJ(targetObject?: THREE.Object3D): { text: string; size: number } {
    const exporter = new OBJExporter();
    const input = targetObject || this.getExportableGroup();
    const text = exporter.parse(input);
    const size = new Blob([text], { type: 'text/plain' }).size;
    return { text, size };
  }

  public downloadFile(data: Blob | string, filename: string) {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public renderSnapshot(options: {
    width?: number;
    height?: number;
    transparent?: boolean;
    targetObject?: THREE.Object3D;
  } = {}): string {
    const width = options.width || 1200;
    const height = options.height || 1200;

    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevAspect = this.camera.aspect;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const grid = this.scene.getObjectByName('__Studio_Grid__');
    const ground = this.scene.getObjectByName('__Studio_Ground__');
    const wasGridVisible = grid ? grid.visible : false;
    const wasGroundVisible = ground ? ground.visible : false;
    if (grid) grid.visible = false;

    if (options.transparent) {
      if (ground) ground.visible = false;
      this.renderer.setClearColor(0x000000, 0.0);
    } else {
      this.renderer.setClearColor(0x0d101a, 1.0);
    }

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    if (grid) grid.visible = wasGridVisible;
    if (ground) ground.visible = wasGroundVisible;

    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  public getCameraTelemetry(targetPos: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0)): CameraPoseTelemetry {
    const pos = this.camera.position;
    const dx = pos.x - targetPos.x;
    const dy = pos.y - targetPos.y;
    const dz = pos.z - targetPos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const pitchRad = Math.atan2(dy, Math.max(0.001, horizontalDist));
    const pitchDeg = Math.round(pitchRad * (180 / Math.PI));

    const yawRad = Math.atan2(dx, dz);
    const yawDeg = Math.round(yawRad * (180 / Math.PI));

    let viewDesc = 'Three-quarter perspective';
    if (pitchDeg > 65) viewDesc = 'Steep overhead top-down bird-eye view';
    else if (pitchDeg > 40) viewDesc = 'High-angle elevated perspective';
    else if (pitchDeg < 15 && pitchDeg > -10) viewDesc = 'Eye-level frontal horizon perspective';
    else if (pitchDeg <= -10) viewDesc = 'Low-angle hero worm-eye perspective';

    return {
      position: [Math.round(pos.x * 100) / 100, Math.round(pos.y * 100) / 100, Math.round(pos.z * 100) / 100],
      target: [Math.round(targetPos.x * 100) / 100, Math.round(targetPos.y * 100) / 100, Math.round(targetPos.z * 100) / 100],
      distance: Math.round(totalDist * 100) / 100,
      pitchDegrees: pitchDeg,
      yawDegrees: yawDeg,
      fov: Math.round(this.camera.fov),
      viewDescription: viewDesc
    };
  }

  public capturePhotorealConditioning(options: {
    targetPos?: THREE.Vector3;
    style?: 'golden_hour' | 'crisp_daylight' | 'blue_hour' | 'moody_rain';
    category?: 'auto' | 'product' | 'architecture' | 'scifi' | 'sculpture';
    width?: number;
    height?: number;
  } = {}): PhotorealConditioningBundle {
    const width = options.width || 1024;
    const height = options.height || 1024;
    const target = options.targetPos || new THREE.Vector3(0, 1.5, 0);

    const telemetry = this.getCameraTelemetry(target);

    // 1. Color Beauty Pass
    const colorPassUrl = this.renderSnapshot({ width, height, transparent: false });

    // 2. ControlNet Depth Pass
    const depthPassUrl = this.renderDepthPass(width, height);

    // 3. ControlNet Normal Pass
    const normalPassUrl = this.renderNormalPass(width, height);

    // 4. Auto-detect subject category from active scene objects
    let detectedCategory = options.category || 'auto';
    if (detectedCategory === 'auto') {
      const names: string[] = [];
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData?.isStudioAsset) {
          names.push(obj.name.toLowerCase());
        }
      });
      const allNames = names.join(' ');
      if (allNames.includes('house') || allNames.includes('roof') || allNames.includes('window') || allNames.includes('door') || allNames.includes('floor')) {
        detectedCategory = 'architecture';
      } else if (allNames.includes('crate') || allNames.includes('cyber') || allNames.includes('neon') || allNames.includes('gear')) {
        detectedCategory = 'scifi';
      } else if (allNames.includes('sculpt') || allNames.includes('plinth') || allNames.includes('monolith')) {
        detectedCategory = 'sculpture';
      } else {
        detectedCategory = 'product';
      }
    }

    // 5. Generate tailored prompt based on category and atmospheric lighting
    let styleDescriptor = 'warm golden hour sunset lighting with soft directional sunlight';
    if (options.style === 'crisp_daylight') styleDescriptor = 'clean bright daylight with sharp details and soft realistic contact shadows';
    else if (options.style === 'blue_hour') styleDescriptor = 'sophisticated blue hour twilight with cool ambient tones, subtle steam/reflections, and gentle side rim lighting';
    else if (options.style === 'moody_rain') styleDescriptor = 'overcast moody studio softbox lighting with rich smooth gradients';

    let subjectPrefix = 'Photorealistic studio commercial product photograph of the object in the reference image';
    if (detectedCategory === 'architecture') {
      subjectPrefix = 'Ultra-photorealistic architectural photograph of the structure in the reference image';
    } else if (detectedCategory === 'scifi') {
      subjectPrefix = 'Cinematic photorealistic industrial render of the mechanical asset in the reference image';
    } else if (detectedCategory === 'sculpture') {
      subjectPrefix = 'Fine art gallery photograph of the sculptural piece in the reference image';
    }

    const suggestedPrompt = `${subjectPrefix}, STRICTLY preserving the camera viewpoint (${telemetry.viewDescription} at exactly ${telemetry.pitchDegrees}-degree downward pitch angle). ${styleDescriptor}, premium photorealistic materials, razor-sharp focus, perfectly matched 3D geometry, 8k resolution.`;

    return {
      colorPassUrl,
      depthPassUrl,
      normalPassUrl,
      camera: telemetry,
      suggestedPrompt,
      resolution: `${width}x${height}`
    };
  }

  private renderDepthPass(width: number, height: number): string {
    const prevOverride = this.scene.overrideMaterial;
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevAspect = this.camera.aspect;
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);

    const prevNear = this.camera.near;
    const prevFar = this.camera.far;
    const dist = this.camera.position.length();
    this.camera.near = Math.max(0.1, dist * 0.4);
    this.camera.far = dist * 1.6 + 2.0;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Toggle grid/ground helpers
    const grid = this.scene.getObjectByName('__Studio_Grid__');
    const wasGrid = grid?.visible;
    if (grid) grid.visible = false;

    // Use Depth Material
    const depthMaterial = new THREE.MeshDepthMaterial();
    this.scene.overrideMaterial = depthMaterial;
    this.renderer.setClearColor(0x000000, 1.0);

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore
    this.camera.near = prevNear;
    this.camera.far = prevFar;
    this.scene.overrideMaterial = prevOverride;
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    if (grid && wasGrid !== undefined) grid.visible = wasGrid;
    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  private renderNormalPass(width: number, height: number): string {
    const prevOverride = this.scene.overrideMaterial;
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevAspect = this.camera.aspect;
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const grid = this.scene.getObjectByName('__Studio_Grid__');
    const wasGrid = grid?.visible;
    if (grid) grid.visible = false;

    // Use Normal Material
    const normalMaterial = new THREE.MeshNormalMaterial();
    this.scene.overrideMaterial = normalMaterial;
    this.renderer.setClearColor(0x7f7fff, 1.0); // neutral normal blue

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore
    this.scene.overrideMaterial = prevOverride;
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    if (grid && wasGrid !== undefined) grid.visible = wasGrid;
    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  private getExportableGroup(): THREE.Group {
    const group = new THREE.Group();
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.isStudioAsset) {
        const clone = child.clone();
        group.add(clone);
      }
    });
    return group;
  }
}
