import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface RigidBodyBinding {
  mesh?: THREE.Object3D;
  body: CANNON.Body;
  isKinematic?: boolean;
}

export class PhysicsEngine {
  public world: CANNON.World;
  private bindings: RigidBodyBinding[] = [];
  public groundBody: CANNON.Body | null = null;
  private staticColliders: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -22, 0)
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as any).iterations = 10;
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.05;

    this.createGround();
  }

  private createGround() {
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape
    });
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.groundBody.position.set(0, 0, 0);
    this.world.addBody(this.groundBody);
  }

  public registerStaticBox(mesh: THREE.Object3D, width: number, height: number, depth: number): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
      quaternion: new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w)
    });
    this.world.addBody(body);
    this.bindings.push({ mesh, body });
    return body;
  }

  public createStaticBox(dimensions: THREE.Vector3, position: THREE.Vector3): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2));
    const body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    this.world.addBody(body);
    this.staticColliders.push(body);
    return body;
  }

  public registerKinematicPlatform(mesh: THREE.Object3D, width: number, height: number, depth: number): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: shape,
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
      quaternion: new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w)
    });
    this.world.addBody(body);
    this.bindings.push({ mesh, body, isKinematic: true });
    return body;
  }

  public createKinematicPlatform(dimensions: THREE.Vector3, position: THREE.Vector3): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2));
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    this.world.addBody(body);
    this.staticColliders.push(body);
    return body;
  }

  public createPlayerBody(radius: number, height: number, spawnPos: THREE.Vector3): CANNON.Body {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 65,
      shape: shape,
      position: new CANNON.Vec3(spawnPos.x, spawnPos.y + radius, spawnPos.z),
      linearDamping: 0.1,
      fixedRotation: true
    });
    this.world.addBody(body);
    return body;
  }

  public clearColliders() {
    this.staticColliders.forEach(b => this.world.removeBody(b));
    this.staticColliders = [];
  }

  public removeBody(body: CANNON.Body) {
    this.world.removeBody(body);
    this.bindings = this.bindings.filter(b => b.body !== body);
    this.staticColliders = this.staticColliders.filter(b => b !== body);
  }

  public clearNonGround() {
    const toRemove = this.world.bodies.filter(b => b !== this.groundBody);
    toRemove.forEach(b => this.world.removeBody(b));
    this.bindings = [];
    this.staticColliders = [];
  }

  public step(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    this.world.step(1 / 60, clampedDt, 3);

    for (const binding of this.bindings) {
      if (binding.mesh) {
        if (binding.isKinematic) {
          binding.body.position.copy(binding.mesh.position as any);
          binding.body.quaternion.copy(binding.mesh.quaternion as any);
        } else if (binding.body.mass > 0) {
          binding.mesh.position.copy(binding.body.position as any);
          binding.mesh.quaternion.copy(binding.body.quaternion as any);
        }
      }
    }
  }
}
