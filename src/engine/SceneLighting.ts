import * as THREE from 'three';
import { LightingPreset } from './types';

export class SceneLighting {
  public group: THREE.Group = new THREE.Group();
  public keyLight!: THREE.DirectionalLight;
  public fillLight!: THREE.DirectionalLight;
  public rimLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public groundPlane!: THREE.Mesh;
  public gridHelper!: THREE.GridHelper;
  public currentPreset: LightingPreset = 'studio_high_key';

  constructor(private scene: THREE.Scene) {
    this.group.name = '__Studio_Lighting__';
    this.initLights();
    this.initGround();
    this.scene.add(this.group);
    this.applyPreset('studio_high_key');
  }

  private initLights() {
    // Hemisphere ambient light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    this.hemiLight.position.set(0, 20, 0);
    this.group.add(this.hemiLight);

    // Key Light (Main caster of soft shadows)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.keyLight.position.set(6, 12, 8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 35;
    this.keyLight.shadow.camera.left = -8;
    this.keyLight.shadow.camera.right = 8;
    this.keyLight.shadow.camera.top = 8;
    this.keyLight.shadow.camera.bottom = -8;
    this.keyLight.shadow.bias = -0.0003;
    this.keyLight.shadow.radius = 2.5;
    this.group.add(this.keyLight);

    // Fill Light (Soft side illumination)
    this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    this.fillLight.position.set(-8, 6, -4);
    this.group.add(this.fillLight);

    // Rim / Back Light (Silhouetting edges)
    this.rimLight = new THREE.DirectionalLight(0xf8fafc, 1.2);
    this.rimLight.position.set(2, 8, -10);
    this.group.add(this.rimLight);
  }

  private initGround() {
    // Shadow catcher ground plane
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.ShadowMaterial({
      opacity: 0.28
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.005;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = '__Studio_Ground__';
    this.group.add(this.groundPlane);

    // Studio Grid
    this.gridHelper = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
    this.gridHelper.position.y = 0;
    // subtle styling
    const materials = Array.isArray(this.gridHelper.material) ? this.gridHelper.material : [this.gridHelper.material];
    materials.forEach(m => {
      m.transparent = true;
      m.opacity = 0.45;
    });
    this.gridHelper.name = '__Studio_Grid__';
    this.group.add(this.gridHelper);
  }

  public applyPreset(preset: LightingPreset) {
    this.currentPreset = preset;

    switch (preset) {
      case 'studio_high_key':
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x334155);
        this.hemiLight.intensity = 0.7;

        this.keyLight.color.setHex(0xffffff);
        this.keyLight.intensity = 2.0;
        this.keyLight.position.set(6, 12, 7);

        this.fillLight.color.setHex(0xe2e8f0);
        this.fillLight.intensity = 0.8;
        this.fillLight.position.set(-7, 6, -4);

        this.rimLight.color.setHex(0xffffff);
        this.rimLight.intensity = 1.3;
        this.rimLight.position.set(3, 8, -9);
        break;

      case 'cinematic_noir':
        this.hemiLight.color.setHex(0x1e1b4b);
        this.hemiLight.groundColor.setHex(0x020617);
        this.hemiLight.intensity = 0.25;

        this.keyLight.color.setHex(0xf1f5f9);
        this.keyLight.intensity = 2.8;
        this.keyLight.position.set(8, 10, 4);

        this.fillLight.color.setHex(0x38bdf8);
        this.fillLight.intensity = 0.4;
        this.fillLight.position.set(-6, 3, -6);

        this.rimLight.color.setHex(0x6366f1);
        this.rimLight.intensity = 3.2;
        this.rimLight.position.set(-2, 7, -10);
        break;

      case 'cyber_sunset':
        this.hemiLight.color.setHex(0xa855f7);
        this.hemiLight.groundColor.setHex(0x0f172a);
        this.hemiLight.intensity = 0.45;

        this.keyLight.color.setHex(0xf43f5e);
        this.keyLight.intensity = 2.2;
        this.keyLight.position.set(7, 9, 6);

        this.fillLight.color.setHex(0x06b6d4);
        this.fillLight.intensity = 1.5;
        this.fillLight.position.set(-8, 5, -3);

        this.rimLight.color.setHex(0xfbbf24);
        this.rimLight.intensity = 2.4;
        this.rimLight.position.set(3, 8, -8);
        break;

      case 'warm_editorial':
        this.hemiLight.color.setHex(0xfef3c7);
        this.hemiLight.groundColor.setHex(0x451a03);
        this.hemiLight.intensity = 0.6;

        this.keyLight.color.setHex(0xfbbf24);
        this.keyLight.intensity = 2.2;
        this.keyLight.position.set(6, 11, 7);

        this.fillLight.color.setHex(0xfde68a);
        this.fillLight.intensity = 0.9;
        this.fillLight.position.set(-7, 6, -5);

        this.rimLight.color.setHex(0xffedd5);
        this.rimLight.intensity = 1.5;
        this.rimLight.position.set(2, 9, -9);
        break;

      case 'minimal_clay':
        this.hemiLight.color.setHex(0xf8fafc);
        this.hemiLight.groundColor.setHex(0x64748b);
        this.hemiLight.intensity = 0.85;

        this.keyLight.color.setHex(0xffffff);
        this.keyLight.intensity = 1.4;
        this.keyLight.position.set(5, 12, 6);

        this.fillLight.color.setHex(0xe2e8f0);
        this.fillLight.intensity = 0.9;
        this.fillLight.position.set(-6, 8, -4);

        this.rimLight.color.setHex(0xffffff);
        this.rimLight.intensity = 0.7;
        this.rimLight.position.set(0, 8, -8);
        break;
    }
  }

  public toggleGrid(visible: boolean) {
    this.gridHelper.visible = visible;
  }

  public toggleGround(visible: boolean) {
    this.groundPlane.visible = visible;
  }
}
