import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine';
import { AudioSystem } from './AudioSystem';

export class CharacterController {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  private isGrounded = false;
  private moveSpeed = 7.5;
  private sprintSpeed = 11.0;
  private jumpForce = 11.5;

  private keys: Record<string, boolean> = {};
  private active = false;

  private targetRotation = 0;
  private currentRotation = 0;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private physics: PhysicsEngine,
    private audio: AudioSystem,
    private spawnPoint: THREE.Vector3 = new THREE.Vector3(0, 2, 0)
  ) {
    this.mesh = this.createPlayerMesh();
    this.scene.add(this.mesh);

    this.body = this.physics.createPlayerBody(0.5, 1.6, spawnPoint);
    this.mesh.position.copy(spawnPoint);

    this.setupInputs();
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = '__Player_Avatar__';

    // Stylized Voxel Runner Character
    // Head
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0a97c, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.74, 0.25, 0.74);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.7;
    group.add(hair);

    // Neon Eyes
    const eyeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.05);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 1.35, 0.36);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 1.35, 0.36);
    group.add(eyeL, eyeR);

    // Torso / Cyan Hoodie
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.9, 0.45);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.65;
    torso.castShadow = true;
    group.add(torso);

    // Legs / Pants
    const legGeo = new THREE.BoxGeometry(0.28, 0.6, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.2, 0.05, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.2, 0.05, 0);
    legR.castShadow = true;
    group.add(legL, legR);

    // White Sneakers
    const shoeGeo = new THREE.BoxGeometry(0.3, 0.2, 0.45);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(-0.2, -0.25, 0.06);
    shoeL.castShadow = true;
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0.2, -0.25, 0.06);
    shoeR.castShadow = true;
    group.add(shoeL, shoeR);

    return group;
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.jump();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.active) return;
      this.keys[e.code] = false;
    });
  }

  public setActive(active: boolean) {
    this.active = active;
    this.mesh.visible = active;
    if (!active) {
      this.keys = {};
    }
  }

  public respawn(point?: THREE.Vector3) {
    const p = point || this.spawnPoint;
    this.body.position.set(p.x, p.y + 0.6, p.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.mesh.position.copy(p);
  }

  public jump(overrideForce?: number) {
    if (!this.isGrounded && !overrideForce) return;
    const force = overrideForce || this.jumpForce;
    this.body.velocity.y = force;
    this.isGrounded = false;
    if (!overrideForce) {
      this.audio.playJump();
    } else {
      this.audio.playBooster();
    }
  }

  public update(dt: number) {
    if (!this.active) return;

    // 1. Check grounding via raycast down from player center
    const from = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
    const to = new CANNON.Vec3(this.body.position.x, this.body.position.y - 0.75, this.body.position.z);
    const result = new CANNON.RaycastResult();
    this.physics.world.raycastClosest(from, to, {}, result);
    this.isGrounded = result.hasHit && result.body !== this.body;

    // 2. Input movement vector
    let forward = 0;
    let right = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;

    const isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;

    // Movement relative to camera heading
    const camEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    const camYaw = camEuler.y;

    const moveVector = new THREE.Vector3(right, 0, -forward);
    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);

      this.body.velocity.x = moveVector.x * speed;
      this.body.velocity.z = moveVector.z * speed;

      // Smooth avatar rotation facing movement direction
      this.targetRotation = Math.atan2(moveVector.x, moveVector.z);
      this.currentRotation = THREE.MathUtils.lerp(this.currentRotation, this.targetRotation, 0.2);
      this.mesh.rotation.y = this.currentRotation;
    } else {
      // Damping when stopped
      this.body.velocity.x *= 0.8;
      this.body.velocity.z *= 0.8;
    }

    // 3. Sync visual mesh with physics body
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.25, // Offset visual feet to ground level
      this.body.position.z
    );

    // 4. Smooth 3rd-person chase camera
    const cameraTarget = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 1.2,
      this.mesh.position.z
    );

    // Position camera behind player based on camera heading
    const camDist = 6.0;
    const camHeight = 2.8;
    const idealOffset = new THREE.Vector3(
      Math.sin(camYaw) * -camDist,
      camHeight,
      Math.cos(camYaw) * -camDist
    );

    const targetCamPos = cameraTarget.clone().add(idealOffset);
    this.camera.position.lerp(targetCamPos, 0.12);
    this.camera.lookAt(cameraTarget);

    // 5. Fall pit check
    if (this.body.position.y < -15) {
      this.audio.playHazard();
      this.respawn();
    }
  }

  public dispose() {
    this.scene.remove(this.mesh);
    this.physics.removeBody(this.body);
  }
}
