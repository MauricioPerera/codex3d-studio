import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine';
import { AudioSystem } from './AudioSystem';

export class CharacterController {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  private isGrounded = false;
  private moveSpeed = 8.0;
  private sprintSpeed = 12.5;
  private jumpForce = 12.0;

  private keys: Record<string, boolean> = {};
  public active = false;
  public currentAvatar: 'voxel_runner' | 'marble_ball' = 'voxel_runner';

  private targetRotation = 0;
  private currentRotation = 0;

  // Touch controls input
  public touchMove = { forward: 0, right: 0 };

  // 3rd Person Orbit Follow Camera
  private camYaw = 0; // 0 = looking down +Z
  private camPitch = 0.32; // ~18 degrees downward pitch
  private camDist = 5.5;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private physics: PhysicsEngine,
    private audio: AudioSystem,
    private spawnPoint: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0)
  ) {
    this.mesh = this.createPlayerMesh();
    this.scene.add(this.mesh);

    this.body = this.physics.createPlayerBody(0.5, 1.6, spawnPoint);
    this.mesh.position.copy(spawnPoint);

    this.setupInputs();
  }

  public setAvatar(type: 'voxel_runner' | 'marble_ball') {
    this.currentAvatar = type;
    this.scene.remove(this.mesh);
    this.mesh = this.createPlayerMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = this.active;
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = '__Player_Avatar__';

    if (this.currentAvatar === 'marble_ball') {
      // Speed Marble / Rolling Sphere Avatar
      const sphereGeo = new THREE.SphereGeometry(0.55, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.95
      });
      const marble = new THREE.Mesh(sphereGeo, sphereMat);
      marble.castShadow = true;
      marble.position.y = 0.55;
      group.add(marble);

      // Inner energy core
      const coreGeo = new THREE.DodecahedronGeometry(0.28);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.55;
      group.add(core);

      return group;
    }

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
      emissiveIntensity: 1.0,
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

    // Mouse drag rotation for 3rd person camera
    window.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      if (e.buttons === 1 || e.buttons === 2) {
        this.camYaw -= e.movementX * 0.005;
        this.camPitch = Math.max(0.08, Math.min(1.2, this.camPitch + e.movementY * 0.005));
      }
    });
  }

  public setActive(active: boolean) {
    this.active = active;
    this.mesh.visible = active;
    if (!active) {
      this.keys = {};
      this.touchMove = { forward: 0, right: 0 };
    }
  }

  public respawn(point?: THREE.Vector3) {
    const p = point || this.spawnPoint;
    this.body.position.set(p.x, p.y + 0.8, p.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.mesh.position.copy(p);

    this.camYaw = 0;
    this.camPitch = 0.32;
    this.updateCameraImmediate();
  }

  private updateCameraImmediate() {
    const cameraTarget = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 1.2,
      this.mesh.position.z
    );
    const horizontalDist = Math.cos(this.camPitch) * this.camDist;
    const verticalDist = Math.sin(this.camPitch) * this.camDist;

    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * -horizontalDist,
      verticalDist,
      Math.cos(this.camYaw) * -horizontalDist
    );
    this.camera.position.copy(cameraTarget).add(offset);
    this.camera.lookAt(cameraTarget);
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

    // 2. Input movement vector (Keyboard + Virtual Touch)
    let forward = this.touchMove.forward;
    let right = this.touchMove.right;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;

    const isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;

    const moveVector = new THREE.Vector3(right, 0, forward);
    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

      this.body.velocity.x = moveVector.x * speed;
      this.body.velocity.z = moveVector.z * speed;

      // Smooth avatar rotation facing movement direction
      this.targetRotation = Math.atan2(moveVector.x, moveVector.z);
      this.currentRotation = THREE.MathUtils.lerp(this.currentRotation, this.targetRotation, 0.2);
      this.mesh.rotation.y = this.currentRotation;

      if (this.currentAvatar === 'marble_ball') {
        // Roll ball forward
        this.mesh.rotation.x += dt * speed * 2;
      }
    } else {
      // Damping when stopped
      this.body.velocity.x *= 0.8;
      this.body.velocity.z *= 0.8;
    }

    // 3. Sync visual mesh with physics body
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.25,
      this.body.position.z
    );

    // 4. Smooth 3rd-person follow camera
    const cameraTarget = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 1.2,
      this.mesh.position.z
    );
    const horizontalDist = Math.cos(this.camPitch) * this.camDist;
    const verticalDist = Math.sin(this.camPitch) * this.camDist;

    const idealOffset = new THREE.Vector3(
      Math.sin(this.camYaw) * -horizontalDist,
      verticalDist,
      Math.cos(this.camYaw) * -horizontalDist
    );

    const targetCamPos = cameraTarget.clone().add(idealOffset);
    this.camera.position.lerp(targetCamPos, 0.16);
    this.camera.lookAt(cameraTarget);

    // 5. Fall pit check
    if (this.body.position.y < -12) {
      this.audio.playHazard();
      this.respawn();
    }
  }

  public dispose() {
    this.scene.remove(this.mesh);
    this.physics.removeBody(this.body);
  }
}
