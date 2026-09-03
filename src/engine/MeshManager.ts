import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { MaterialManager } from './MaterialManager';
import { 
  PrimitiveType, 
  CSGOperationType, 
  DeformerType, 
  MaterialPreset, 
  PBRMaterialOptions,
  ObjectTransformOptions,
  SceneObjectMeta 
} from './types';

export class MeshManager {
  private objects: Map<string, THREE.Mesh> = new Map();
  private csgEvaluator: Evaluator;
  private idCounter = 1;

  constructor(
    private scene: THREE.Scene, 
    private materialManager: MaterialManager
  ) {
    this.csgEvaluator = new Evaluator();
    this.csgEvaluator.useGroups = true;
  }

  public generateId(prefix = 'obj'): string {
    return `${prefix}_${this.idCounter++}`;
  }

  public getObjects(): THREE.Mesh[] {
    return Array.from(this.objects.values());
  }

  public getObjectById(id: string): THREE.Mesh | undefined {
    return this.objects.get(id);
  }

  public createPrimitive(params: {
    type: PrimitiveType;
    name?: string;
    dimensions?: Record<string, number>;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number] | number;
    materialPreset?: MaterialPreset;
    materialOptions?: PBRMaterialOptions;
  }): THREE.Mesh {
    const { type, dimensions = {} } = params;
    let geo: THREE.BufferGeometry;

    switch (type) {
      case 'box':
        geo = new THREE.BoxGeometry(
          dimensions.width ?? 1.5,
          dimensions.height ?? 1.5,
          dimensions.depth ?? 1.5,
          dimensions.segments ?? 1,
          dimensions.segments ?? 1,
          dimensions.segments ?? 1
        );
        break;

      case 'sphere':
        geo = new THREE.SphereGeometry(
          dimensions.radius ?? 1.0,
          dimensions.widthSegments ?? 32,
          dimensions.heightSegments ?? 24
        );
        break;

      case 'cylinder':
        geo = new THREE.CylinderGeometry(
          dimensions.radiusTop ?? 0.8,
          dimensions.radiusBottom ?? 0.8,
          dimensions.height ?? 2.0,
          dimensions.radialSegments ?? 32
        );
        break;

      case 'cone':
        geo = new THREE.ConeGeometry(
          dimensions.radius ?? 1.0,
          dimensions.height ?? 2.0,
          dimensions.radialSegments ?? 32
        );
        break;

      case 'torus':
        geo = new THREE.TorusGeometry(
          dimensions.radius ?? 1.0,
          dimensions.tube ?? 0.35,
          dimensions.radialSegments ?? 24,
          dimensions.tubularSegments ?? 48
        );
        break;

      case 'torus_knot':
        geo = new THREE.TorusKnotGeometry(
          dimensions.radius ?? 0.9,
          dimensions.tube ?? 0.28,
          dimensions.tubularSegments ?? 96,
          dimensions.radialSegments ?? 24,
          dimensions.p ?? 2,
          dimensions.q ?? 3
        );
        break;

      case 'capsule':
        geo = new THREE.CapsuleGeometry(
          dimensions.radius ?? 0.6,
          dimensions.length ?? 1.2,
          dimensions.capSubdivisions ?? 8,
          dimensions.radialSegments ?? 24
        );
        break;

      case 'plane':
        geo = new THREE.PlaneGeometry(
          dimensions.width ?? 2.5,
          dimensions.height ?? 2.5
        );
        break;

      case 'ring':
        geo = new THREE.RingGeometry(
          dimensions.innerRadius ?? 0.5,
          dimensions.outerRadius ?? 1.2,
          dimensions.thetaSegments ?? 32
        );
        break;

      case 'dodecahedron':
        geo = new THREE.DodecahedronGeometry(
          dimensions.radius ?? 1.0,
          dimensions.detail ?? 0
        );
        break;

      default:
        geo = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = this.materialManager.createMaterial(
      params.materialOptions, 
      params.materialPreset || 'ceramic_white'
    );

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const id = this.generateId(type);
    mesh.name = params.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.idCounter}`;
    mesh.userData = { id, type, isStudioAsset: true };

    if (params.position) {
      mesh.position.set(...params.position);
    } else {
      // Default to sitting slightly above ground
      geo.computeBoundingBox();
      if (geo.boundingBox) {
        mesh.position.y = -geo.boundingBox.min.y;
      }
    }

    if (params.rotation) {
      mesh.rotation.set(
        params.rotation[0] * Math.PI / 180,
        params.rotation[1] * Math.PI / 180,
        params.rotation[2] * Math.PI / 180
      );
    }

    if (params.scale) {
      if (typeof params.scale === 'number') {
        mesh.scale.setScalar(params.scale);
      } else {
        mesh.scale.set(...params.scale);
      }
    }

    this.scene.add(mesh);
    this.objects.set(id, mesh);
    return mesh;
  }

  public csgOperation(params: {
    operation: CSGOperationType;
    targetAId: string;
    targetBId: string;
    name?: string;
    keepOriginals?: boolean;
    materialPreset?: MaterialPreset;
  }): THREE.Mesh {
    const meshA = this.objects.get(params.targetAId);
    const meshB = this.objects.get(params.targetBId);

    if (!meshA || !meshB) {
      throw new Error(`CSG Error: Meshes ${params.targetAId} or ${params.targetBId} not found`);
    }

    meshA.updateMatrixWorld(true);
    meshB.updateMatrixWorld(true);

    const brushA = new Brush(meshA.geometry.clone(), meshA.material);
    brushA.position.copy(meshA.position);
    brushA.rotation.copy(meshA.rotation);
    brushA.scale.copy(meshA.scale);
    brushA.updateMatrixWorld(true);

    const brushB = new Brush(meshB.geometry.clone(), meshB.material);
    brushB.position.copy(meshB.position);
    brushB.rotation.copy(meshB.rotation);
    brushB.scale.copy(meshB.scale);
    brushB.updateMatrixWorld(true);

    let opConstant = SUBTRACTION;
    if (params.operation === 'union') opConstant = ADDITION;
    else if (params.operation === 'intersect') opConstant = INTERSECTION;

    const resultBrush = this.csgEvaluator.evaluate(brushA, brushB, opConstant);
    resultBrush.geometry.computeVertexNormals();

    const id = this.generateId(`csg_${params.operation}`);
    const name = params.name || `${params.operation.toUpperCase()}: ${meshA.name} & ${meshB.name}`;

    const material = params.materialPreset 
      ? this.materialManager.createMaterial({}, params.materialPreset)
      : (Array.isArray(meshA.material) ? meshA.material[0] : meshA.material).clone();

    const resultMesh = new THREE.Mesh(resultBrush.geometry, material);
    resultMesh.castShadow = true;
    resultMesh.receiveShadow = true;
    resultMesh.name = name;
    resultMesh.userData = { id, type: `csg_${params.operation}`, isStudioAsset: true };

    if (!params.keepOriginals) {
      this.deleteObject(params.targetAId);
      this.deleteObject(params.targetBId);
    }

    this.scene.add(resultMesh);
    this.objects.set(id, resultMesh);
    return resultMesh;
  }

  public createExtrudedShape(params: {
    shapeType?: 'star' | 'gear' | 'polygon' | 'custom';
    points?: Array<[number, number]>;
    pointsCount?: number;
    depth?: number;
    bevelEnabled?: boolean;
    bevelThickness?: number;
    bevelSize?: number;
    bevelSegments?: number;
    name?: string;
    materialPreset?: MaterialPreset;
    position?: [number, number, number];
  }): THREE.Mesh {
    const shape = new THREE.Shape();
    const type = params.shapeType || 'star';

    if (type === 'star') {
      const points = 5;
      const outerRadius = 1.0;
      const innerRadius = 0.45;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
    } else if (type === 'gear') {
      const teeth = 8;
      const outerR = 1.1;
      const rootR = 0.8;
      for (let i = 0; i < teeth * 4; i++) {
        const step = i % 4;
        const r = (step === 1 || step === 2) ? outerR : rootR;
        const a = (i / (teeth * 4)) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();

      // Gear center hole
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.35, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    } else if (params.points && params.points.length > 2) {
      shape.moveTo(params.points[0][0], params.points[0][1]);
      for (let i = 1; i < params.points.length; i++) {
        shape.lineTo(params.points[i][0], params.points[i][1]);
      }
      shape.closePath();
    } else {
      // Default hexagon
      const sides = params.pointsCount || 6;
      const radius = 1.0;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
    }

    const extrudeSettings = {
      depth: params.depth ?? 0.4,
      bevelEnabled: params.bevelEnabled ?? true,
      bevelThickness: params.bevelThickness ?? 0.05,
      bevelSize: params.bevelSize ?? 0.04,
      bevelSegments: params.bevelSegments ?? 3
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();

    const material = this.materialManager.createMaterial({}, params.materialPreset || 'polished_chrome');
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const id = this.generateId('extrude');
    mesh.name = params.name || `Extruded ${type.toUpperCase()}`;
    mesh.userData = { id, type: 'extrude', isStudioAsset: true };

    if (params.position) {
      mesh.position.set(...params.position);
    } else {
      mesh.position.y = (params.depth ?? 0.4) / 2 + 0.1;
    }

    this.scene.add(mesh);
    this.objects.set(id, mesh);
    return mesh;
  }

  public createParametricAsset(params: {
    template: 'coffee_mug' | 'wine_glass' | 'pedestal' | 'studio_lamp' | 'sci_fi_crate';
    name?: string;
    position?: [number, number, number];
    materialPreset?: MaterialPreset;
  }): THREE.Mesh {
    const { template } = params;
    let finalMesh: THREE.Mesh;

    if (template === 'coffee_mug') {
      // Body outer cylinder
      const outerGeo = new THREE.CylinderGeometry(0.75, 0.7, 1.6, 32);
      const innerGeo = new THREE.CylinderGeometry(0.65, 0.6, 1.5, 32);
      innerGeo.translate(0, 0.12, 0); // leave thick bottom

      const brushOuter = new Brush(outerGeo);
      brushOuter.updateMatrixWorld(true);
      const brushInner = new Brush(innerGeo);
      brushInner.updateMatrixWorld(true);

      const hollowBody = this.csgEvaluator.evaluate(brushOuter, brushInner, SUBTRACTION);

      // Handle
      const handleGeo = new THREE.TorusGeometry(0.48, 0.1, 16, 32, Math.PI);
      handleGeo.rotateZ(-Math.PI / 2);
      handleGeo.translate(0.75, 0, 0);

      const brushBody = new Brush(hollowBody.geometry);
      brushBody.updateMatrixWorld(true);
      const brushHandle = new Brush(handleGeo);
      brushHandle.updateMatrixWorld(true);

      const combined = this.csgEvaluator.evaluate(brushBody, brushHandle, ADDITION);
      combined.geometry.computeVertexNormals();

      const mat = this.materialManager.createMaterial({}, params.materialPreset || 'ceramic_white');
      finalMesh = new THREE.Mesh(combined.geometry, mat);
    } else if (template === 'wine_glass') {
      // Lathe profile for wine glass
      const points: THREE.Vector2[] = [];
      points.push(new THREE.Vector2(0.65, 0.0));   // base edge
      points.push(new THREE.Vector2(0.65, 0.04));  // base rim
      points.push(new THREE.Vector2(0.08, 0.08));  // taper to stem
      points.push(new THREE.Vector2(0.08, 1.1));   // slender stem
      points.push(new THREE.Vector2(0.2, 1.25));   // bowl bottom
      points.push(new THREE.Vector2(0.7, 1.7));    // bowl widest
      points.push(new THREE.Vector2(0.55, 2.3));   // rim
      points.push(new THREE.Vector2(0.50, 2.3));   // inner rim
      points.push(new THREE.Vector2(0.65, 1.7));   // inner bowl
      points.push(new THREE.Vector2(0.12, 1.28));  // inner bottom
      points.push(new THREE.Vector2(0.0, 1.28));   // close bottom

      const latheGeo = new THREE.LatheGeometry(points, 36);
      latheGeo.computeVertexNormals();
      const mat = this.materialManager.createMaterial({}, params.materialPreset || 'frosted_glass');
      finalMesh = new THREE.Mesh(latheGeo, mat);
    } else if (template === 'pedestal') {
      // Stepped beveled architectural pedestal
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.35, 36);
      baseGeo.translate(0, 0.175, 0);
      const midGeo = new THREE.CylinderGeometry(1.3, 1.35, 1.4, 36);
      midGeo.translate(0, 1.05, 0);
      const topGeo = new THREE.CylinderGeometry(1.5, 1.4, 0.25, 36);
      topGeo.translate(0, 1.875, 0);

      const b1 = new Brush(baseGeo);
      const b2 = new Brush(midGeo);
      const b3 = new Brush(topGeo);
      [b1, b2, b3].forEach(b => b.updateMatrixWorld(true));

      const step1 = this.csgEvaluator.evaluate(b1, b2, ADDITION);
      const brushStep1 = new Brush(step1.geometry);
      brushStep1.updateMatrixWorld(true);
      const step2 = this.csgEvaluator.evaluate(brushStep1, b3, ADDITION);
      step2.geometry.computeVertexNormals();

      const mat = this.materialManager.createMaterial({}, params.materialPreset || 'clay_sculpt');
      finalMesh = new THREE.Mesh(step2.geometry, mat);
    } else if (template === 'sci_fi_crate') {
      // Beveled crate with corner bevels and inset cuts
      const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
      const cut1 = new THREE.BoxGeometry(1.4, 1.4, 2.0);
      const cut2 = new THREE.BoxGeometry(2.0, 1.4, 1.4);

      const bCrate = new Brush(crateGeo);
      const bCut1 = new Brush(cut1);
      const bCut2 = new Brush(cut2);
      [bCrate, bCut1, bCut2].forEach(b => b.updateMatrixWorld(true));

      // Cut small shallow panels on faces
      const s1 = this.csgEvaluator.evaluate(bCrate, bCut1, SUBTRACTION);
      const bS1 = new Brush(s1.geometry);
      bS1.updateMatrixWorld(true);
      const s2 = this.csgEvaluator.evaluate(bS1, bCut2, SUBTRACTION);
      s2.geometry.computeVertexNormals();

      const mat = this.materialManager.createMaterial({}, params.materialPreset || 'carbon_fiber');
      finalMesh = new THREE.Mesh(s2.geometry, mat);
    } else {
      // studio_lamp: base + curved arm + shade
      const base = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 32);
      base.translate(0, 0.075, 0);
      const pole = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16);
      pole.translate(0, 1.15, 0);
      const shade = new THREE.ConeGeometry(0.5, 0.6, 24, 1, true);
      shade.rotateX(Math.PI / 1.3);
      shade.translate(0, 2.2, 0.3);

      const bBase = new Brush(base);
      const bPole = new Brush(pole);
      const bShade = new Brush(shade);
      [bBase, bPole, bShade].forEach(b => b.updateMatrixWorld(true));

      const res1 = this.csgEvaluator.evaluate(bBase, bPole, ADDITION);
      const bRes1 = new Brush(res1.geometry);
      bRes1.updateMatrixWorld(true);
      const res2 = this.csgEvaluator.evaluate(bRes1, bShade, ADDITION);
      res2.geometry.computeVertexNormals();

      const mat = this.materialManager.createMaterial({}, params.materialPreset || 'brushed_gold');
      finalMesh = new THREE.Mesh(res2.geometry, mat);
    }

    finalMesh.castShadow = true;
    finalMesh.receiveShadow = true;
    const id = this.generateId(`asset_${template}`);
    finalMesh.name = params.name || `${template.replace('_', ' ').toUpperCase()}`;
    finalMesh.userData = { id, type: `asset_${template}`, isStudioAsset: true };

    if (params.position) {
      finalMesh.position.set(...params.position);
    } else {
      finalMesh.geometry.computeBoundingBox();
      if (finalMesh.geometry.boundingBox) {
        finalMesh.position.y = -finalMesh.geometry.boundingBox.min.y;
      }
    }

    this.scene.add(finalMesh);
    this.objects.set(id, finalMesh);
    return finalMesh;
  }

  public applyDeformer(params: {
    objectId: string;
    deformer: DeformerType;
    factor?: number;
    axis?: 'x' | 'y' | 'z';
  }): void {
    const mesh = this.objects.get(params.objectId);
    if (!mesh) {
      throw new Error(`Mesh ${params.objectId} not found`);
    }

    mesh.geometry = mesh.geometry.clone();
    const pos = mesh.geometry.attributes.position;
    if (!pos) return;

    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) return;

    const minY = bbox.min.y;
    const maxY = bbox.max.y;
    const height = Math.max(0.001, maxY - minY);
    const factor = params.factor ?? 1.0;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const normalizedY = (y - minY) / height;

      if (params.deformer === 'taper') {
        // scale width along Y
        const scale = 1.0 + (factor - 1.0) * normalizedY;
        x *= scale;
        z *= scale;
      } else if (params.deformer === 'twist') {
        // rotate around Y based on height
        const angle = factor * normalizedY * Math.PI;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const newX = x * cosA - z * sinA;
        const newZ = x * sinA + z * cosA;
        x = newX;
        z = newZ;
      } else if (params.deformer === 'bend') {
        // curve along X axis as Y increases
        const curve = Math.sin(normalizedY * Math.PI * 0.5) * factor;
        x += curve;
      } else if (params.deformer === 'noise') {
        // organic surface ripple
        const wave = Math.sin(x * 4 + y * 6) * Math.cos(z * 4) * 0.08 * factor;
        x += wave;
        y += wave;
        z += wave;
      }

      pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }

  public modifyTransform(params: {
    objectId: string;
    transform: ObjectTransformOptions;
  }): void {
    const mesh = this.objects.get(params.objectId);
    if (!mesh) {
      throw new Error(`Mesh ${params.objectId} not found`);
    }

    const { transform } = params;

    if (transform.position) {
      mesh.position.set(...transform.position);
    }

    if (transform.rotation) {
      mesh.rotation.set(
        transform.rotation[0] * Math.PI / 180,
        transform.rotation[1] * Math.PI / 180,
        transform.rotation[2] * Math.PI / 180
      );
    }

    if (transform.scale) {
      if (typeof transform.scale === 'number') {
        mesh.scale.setScalar(transform.scale);
      } else {
        mesh.scale.set(...transform.scale);
      }
    }

    if (transform.alignToGround) {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      mesh.position.y -= box.min.y;
    }

    if (transform.centerOrigin) {
      mesh.geometry.center();
    }
  }

  public deleteObject(id: string): boolean {
    const mesh = this.objects.get(id);
    if (!mesh) return false;

    this.scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }

    this.objects.delete(id);
    return true;
  }

  public clearScene(): void {
    for (const id of Array.from(this.objects.keys())) {
      this.deleteObject(id);
    }
  }

  public getSceneMetadata(): SceneObjectMeta[] {
    const metas: SceneObjectMeta[] = [];

    for (const [id, mesh] of this.objects.entries()) {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const matColor = mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial 
        ? `#${mat.color.getHexString()}` 
        : undefined;

      const polyCount = mesh.geometry.index 
        ? mesh.geometry.index.count / 3 
        : (mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count / 3 : 0);

      metas.push({
        id,
        name: mesh.name,
        type: mesh.userData?.type || 'mesh',
        visible: mesh.visible,
        polyCount: Math.round(polyCount),
        vertexCount: mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count : 0,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        rotation: [
          Math.round(mesh.rotation.x * 180 / Math.PI),
          Math.round(mesh.rotation.y * 180 / Math.PI),
          Math.round(mesh.rotation.z * 180 / Math.PI)
        ],
        scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
        materialName: mat ? mat.name : undefined,
        materialColor: matColor,
        bounds: {
          min: [box.min.x, box.min.y, box.min.z],
          max: [box.max.x, box.max.y, box.max.z],
          size: [size.x, size.y, size.z]
        }
      });
    }

    return metas;
  }
}
