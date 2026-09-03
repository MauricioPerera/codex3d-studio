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

  public async exportStandaloneGameHTML(title = 'Codex3D Web Game'): Promise<{ html: string; size: number }> {
    const { blob } = await this.exportGLB();
    const arrayBuffer = await blob.arrayBuffer();
    // Convert arrayBuffer to base64
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64GLB = btoa(binary);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #0a0b0e; font-family: system-ui, -apple-system, sans-serif; }
    #hud {
      position: fixed; top: 20px; left: 20px; right: 20px;
      display: flex; justify-content: space-between; align-items: center;
      pointer-events: none; z-index: 10; color: #fff;
    }
    .badge {
      background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(12px); padding: 8px 16px; border-radius: 9999px;
      font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;
    }
    #controls-hint {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.15);
      backdrop-filter: blur(12px); padding: 8px 18px; border-radius: 9999px;
      color: #94a3b8; font-size: 12px; font-family: monospace; z-index: 10;
    }
    #victory-modal {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px); z-index: 50; justify-content: center; align-items: center;
    }
    .modal-box {
      background: #0f172a; border: 1px solid rgba(245,158,11,0.5); padding: 32px;
      border-radius: 24px; text-align: center; color: white; max-width: 400px;
    }
    button {
      margin-top: 16px; background: #10b981; color: white; border: none;
      padding: 10px 24px; border-radius: 12px; font-weight: bold; cursor: pointer;
    }
  </style>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/",
        "cannon-es": "https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js"
      }
    }
  </script>
</head>
<body>
  <div id="hud">
    <div class="badge">❤️ <span id="lives">3</span> | 💎 <span id="score">0</span></div>
    <div class="badge">⏱️ <span id="time">00:00</span></div>
  </div>
  <div id="controls-hint">WASD / Arrows to Move • SPACE to Jump • Mouse to Rotate</div>

  <div id="victory-modal">
    <div class="modal-box">
      <h2 style="color: #f59e0b; margin-bottom: 8px;">🏆 LEVEL COMPLETE!</h2>
      <p style="color: #94a3b8; font-size: 14px;">You conquered the course!</p>
      <button onclick="location.reload()">Play Again</button>
    </div>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import * as CANNON from 'cannon-es';

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b0e);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Physics
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Player Avatar
    const playerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.4 })
    );
    scene.add(playerMesh);

    const playerBody = new CANNON.Body({
      mass: 60,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(0, 3, 0),
      fixedRotation: true
    });
    world.addBody(playerBody);

    // Load Base64 GLB
    const glbBase64 = "${base64GLB}";
    const binaryStr = atob(glbBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const loader = new GLTFLoader();
    loader.parse(bytes.buffer, '', (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.computeBoundingBox();
          const bbox = child.geometry.boundingBox;
          if (bbox) {
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const body = new CANNON.Body({
              mass: 0,
              shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)),
              position: new CANNON.Vec3(child.position.x, child.position.y, child.position.z)
            });
            world.addBody(body);
          }
        }
      });
    });

    // Controls
    const keys = {};
    window.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'Space') playerBody.velocity.y = 12; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let startTime = Date.now();
    let camYaw = 0;
    window.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) camYaw -= e.movementX * 0.005;
    });

    // Loop
    function animate() {
      requestAnimationFrame(animate);
      world.step(1/60);

      let forward = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      let right = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

      const move = new THREE.Vector3(right, 0, forward).normalize();
      if (move.lengthSq() > 0) {
        move.applyAxisAngle(new THREE.Vector3(0,1,0), camYaw);
        playerBody.velocity.x = move.x * 8;
        playerBody.velocity.z = move.z * 8;
      }

      playerMesh.position.copy(playerBody.position);

      const target = playerMesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const camOffset = new THREE.Vector3(Math.sin(camYaw) * -5.5, 2.8, Math.cos(camYaw) * -5.5);
      camera.position.lerp(target.clone().add(camOffset), 0.15);
      camera.lookAt(target);

      // Fall respawn
      if (playerBody.position.y < -15) {
        playerBody.position.set(0, 3, 0);
        playerBody.velocity.set(0, 0, 0);
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      document.getElementById('time').innerText = m + ':' + s;

      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;

    const size = new Blob([html], { type: 'text/html' }).size;
    return { html, size };
  }
}

