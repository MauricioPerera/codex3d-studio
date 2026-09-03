import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneLighting } from './SceneLighting';
import { MaterialManager } from './MaterialManager';
import { MeshManager } from './MeshManager';
import { Exporter } from './Exporter';
import { GameManager } from '../game/GameManager';
import { CameraPreset, LightingPreset, SceneInspectionResult } from './types';

export class StudioEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public lighting: SceneLighting;
  public materials: MaterialManager;
  public meshes: MeshManager;
  public exporter: Exporter;
  public game: GameManager;

  private isTurntableActive = false;
  private turntableSpeed = 0.008;
  private isWireframe = false;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private onStateChangeCallbacks: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0b0e);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(4, 3.5, 5);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Controls setup
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.08; // prevent going below floor
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 25.0;
    this.controls.target.set(0, 0.8, 0);

    // 5. Managers setup
    this.lighting = new SceneLighting(this.scene);
    this.materials = new MaterialManager();
    this.meshes = new MeshManager(this.scene, this.materials);
    this.exporter = new Exporter(this.scene, this.renderer, this.camera);
    this.game = new GameManager(this.scene, this.camera, this.controls);

    // 6. Start render loop
    this.startLoop();
  }

  private startLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const dt = this.clock.getDelta();

      if (this.game.mode === 'play') {
        this.game.update(dt);
      } else {
        if (this.isTurntableActive) {
          // Rotate scene around target or origin
          const angle = this.turntableSpeed;
          const x = this.camera.position.x - this.controls.target.x;
          const z = this.camera.position.z - this.controls.target.z;
          this.camera.position.x = this.controls.target.x + x * Math.cos(angle) - z * Math.sin(angle);
          this.camera.position.z = this.controls.target.z + x * Math.sin(angle) + z * Math.cos(angle);
          this.camera.lookAt(this.controls.target);
        }
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public setCameraPreset(preset: CameraPreset, targetObjectId?: string) {
    let target = new THREE.Vector3(0, 0.8, 0);
    let dist = 5.5;

    if (targetObjectId) {
      const obj = this.meshes.getObjectById(targetObjectId);
      if (obj) {
        obj.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(obj);
        box.getCenter(target);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        dist = Math.max(3.5, sphere.radius * 2.8);
      }
    }

    this.controls.target.copy(target);

    switch (preset) {
      case 'three_quarter':
        this.camera.position.set(target.x + dist * 0.7, target.y + dist * 0.6, target.z + dist * 0.7);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y + dist * 0.2, target.z + dist);
        break;
      case 'top':
        this.camera.position.set(target.x + 0.001, target.y + dist * 1.2, target.z);
        break;
      case 'side':
        this.camera.position.set(target.x + dist, target.y + dist * 0.2, target.z);
        break;
      case 'isometric':
        this.camera.position.set(target.x + dist, target.y + dist, target.z + dist);
        break;
      case 'hero_low':
        this.camera.position.set(target.x + dist * 0.6, target.y + 0.2, target.z + dist * 0.8);
        break;
      case 'close_up':
        this.camera.position.set(target.x + dist * 0.35, target.y + dist * 0.3, target.z + dist * 0.45);
        break;
    }

    this.camera.lookAt(target);
    this.controls.update();
    this.notifyChange();
  }

  public frameAll() {
    const objects = this.meshes.getObjects();
    if (objects.length === 0) {
      this.setCameraPreset('three_quarter');
      return;
    }

    const box = new THREE.Box3();
    objects.forEach(obj => {
      obj.updateMatrixWorld(true);
      box.expandByObject(obj);
    });

    const center = new THREE.Vector3();
    box.getCenter(center);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const dist = Math.max(3.5, sphere.radius * 2.6);
    this.controls.target.copy(center);
    this.camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.7);
    this.controls.update();
    this.notifyChange();
  }

  public toggleTurntable(active?: boolean): boolean {
    this.isTurntableActive = active !== undefined ? active : !this.isTurntableActive;
    this.notifyChange();
    return this.isTurntableActive;
  }

  public getTurntableState(): boolean {
    return this.isTurntableActive;
  }

  public toggleWireframe(active?: boolean): boolean {
    this.isWireframe = active !== undefined ? active : !this.isWireframe;
    this.meshes.getObjects().forEach(mesh => {
      const mat = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mat.forEach(m => {
        if ('wireframe' in m) {
          (m as any).wireframe = this.isWireframe;
        }
      });
    });
    this.notifyChange();
    return this.isWireframe;
  }

  public getWireframeState(): boolean {
    return this.isWireframe;
  }

  public setLightingPreset(preset: LightingPreset) {
    this.lighting.applyPreset(preset);
    this.notifyChange();
  }

  public inspectScene(): SceneInspectionResult {
    const objects = this.meshes.getSceneMetadata();
    const totalPoly = objects.reduce((sum, o) => sum + o.polyCount, 0);
    const totalVerts = objects.reduce((sum, o) => sum + o.vertexCount, 0);

    return {
      objectCount: objects.length,
      totalPolyCount: totalPoly,
      totalVertexCount: totalVerts,
      lightingPreset: this.lighting.currentPreset,
      objects
    };
  }

  public onStateChange(callback: () => void) {
    this.onStateChangeCallbacks.push(callback);
  }

  public notifyChange() {
    this.onStateChangeCallbacks.forEach(cb => cb());
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
}
