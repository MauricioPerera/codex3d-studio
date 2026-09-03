import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

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

    // Save previous state
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevAspect = this.camera.aspect;

    // Setup snapshot dimensions & background
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Toggle grid visibility during capture
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

    // Render frame
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore previous state
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    if (grid) grid.visible = wasGridVisible;
    if (ground) ground.visible = wasGroundVisible;

    // Render viewport back
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
