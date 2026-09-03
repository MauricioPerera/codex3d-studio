import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsEngine } from './PhysicsEngine';
import { AudioSystem } from './AudioSystem';
import { ParticleSystem } from './ParticleSystem';

export class CharacterController {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  private isGrounded = false;
  private moveSpeed = 9.0;
  private sprintSpeed = 14.0;
  private jumpForce = 12.5;

  private keys: Record<string, boolean> = {};
  public active = false;
  public currentAvatar: 'voxel_runner' | 'marble_ball' = 'voxel_runner';

  private targetRotation = 0;
  private currentRotation = 0;

  // Animation Limb References
  private legL: THREE.Group = new THREE.Group();
  private legR: THREE.Group = new THREE.Group();
  private armL: THREE.Group = new THREE.Group();
  private armR: THREE.Group = new THREE.Group();
  private torsoMesh: THREE.Mesh = new THREE.Mesh();
  private headGroup: THREE.Group = new THREE.Group();
  private walkTime = 0;
  private idleTime = 0;

  // Game Feel (Coyote Time & Jump Buffer)
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;

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
    private particles?: ParticleSystem,
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

    // --- Stylized Voxel Runner Character with Articulated Limbs ---

    // 1. Torso (Cyan Hoodie)
    const torsoGeo = new THREE.BoxGeometry(0.85, 0.85, 0.45);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.45 });
    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.y = 0.7;
    this.torsoMesh.castShadow = true;
    group.add(this.torsoMesh);

    // 2. Head Group (Head, Hair, Glowing Eyes, Headphones)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.35, 0);

    const headGeo = new THREE.BoxGeometry(0.68, 0.68, 0.68);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0a97c, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Stepped Voxel Hair
    const hairGeo = new THREE.BoxGeometry(0.72, 0.24, 0.72);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.32;
    this.headGroup.add(hair);

    // Neon Cyber Eyes
    const eyeGeo = new THREE.BoxGeometry(0.13, 0.09, 0.04);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.2
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 0.02, 0.35);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 0.02, 0.35);
    this.headGroup.add(eyeL, eyeR);

    // Gold-trimmed Headphones
    const bandGeo = new THREE.TorusGeometry(0.42, 0.06, 8, 18, Math.PI);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = -Math.PI / 2;
    band.position.y = 0.35;
    this.headGroup.add(band);

    const cupGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
    const cupL = new THREE.Mesh(cupGeo, cupMat);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.38, 0, 0);
    const cupR = new THREE.Mesh(cupGeo, cupMat);
    cupR.rotation.z = Math.PI / 2;
    cupR.position.set(0.38, 0, 0);
    this.headGroup.add(cupL, cupR);

    group.add(this.headGroup);

    // 3. Articulated Arms with Shoulder Pivots
    const armGeo = new THREE.BoxGeometry(0.24, 0.65, 0.24);
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5 });
    const handGeo = new THREE.BoxGeometry(0.22, 0.18, 0.22);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xe0a97c, roughness: 0.6 });

    // Left Arm Pivot
    this.armL = new THREE.Group();
    this.armL.position.set(-0.52, 1.05, 0);
    const armMeshL = new THREE.Mesh(armGeo, sleeveMat);
    armMeshL.position.y = -0.3;
    armMeshL.castShadow = true;
    this.armL.add(armMeshL);
    const handL = new THREE.Mesh(handGeo, handMat);
    handL.position.y = -0.66;
    this.armL.add(handL);
    group.add(this.armL);

    // Right Arm Pivot
    this.armR = new THREE.Group();
    this.armR.position.set(0.52, 1.05, 0);
    const armMeshR = new THREE.Mesh(armGeo, sleeveMat);
    armMeshR.position.y = -0.3;
    armMeshR.castShadow = true;
    this.armR.add(armMeshR);
    const handR = new THREE.Mesh(handGeo, handMat);
    handR.position.y = -0.66;
    this.armR.add(handR);
    group.add(this.armR);

    // 4. Articulated Legs with Hip Pivots
    const legGeo = new THREE.BoxGeometry(0.28, 0.55, 0.3);
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const shoeGeo = new THREE.BoxGeometry(0.3, 0.2, 0.44);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // Left Leg Pivot (Hip)
    this.legL = new THREE.Group();
    this.legL.position.set(-0.22, 0.48, 0);
    const legMeshL = new THREE.Mesh(legGeo, pantMat);
    legMeshL.position.y = -0.26;
    legMeshL.castShadow = true;
    this.legL.add(legMeshL);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, -0.52, 0.06);
    shoeL.castShadow = true;
    this.legL.add(shoeL);
    group.add(this.legL);

    // Right Leg Pivot (Hip)
    this.legR = new THREE.Group();
    this.legR.position.set(0.22, 0.48, 0);
    const legMeshR = new THREE.Mesh(legGeo, pantMat);
    legMeshR.position.y = -0.26;
    legMeshR.castShadow = true;
    this.legR.add(legMeshR);
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, -0.52, 0.06);
    shoeR.castShadow = true;
    this.legR.add(shoeR);
    group.add(this.legR);

    return group;
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpBufferTimer = 0.18; // Buffer jump for 180ms
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
    this.mesh.rotation.set(0, 0, 0);

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
    const canJump = this.isGrounded || this.coyoteTimer > 0;
    if (!canJump && !overrideForce) return;

    const force = overrideForce || this.jumpForce;
    this.body.velocity.y = force;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    if (!overrideForce) {
      this.audio.playJump();
      if (this.particles) {
        this.particles.emitJumpDust(this.mesh.position);
      }
    } else {
      this.audio.playBooster();
    }
  }

  public update(dt: number) {
    if (!this.active) return;

    // 1. Raycast grounding check
    const from = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
    const to = new CANNON.Vec3(this.body.position.x, this.body.position.y - 0.75, this.body.position.z);
    const result = new CANNON.RaycastResult();
    this.physics.world.raycastClosest(from, to, {}, result);
    const hitGround = result.hasHit && result.body !== this.body;

    if (hitGround) {
      this.isGrounded = true;
      this.coyoteTimer = 0.14; // 140ms grace period after leaving edges
    } else {
      this.isGrounded = false;
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Process Jump Buffer
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
      if (this.isGrounded || this.coyoteTimer > 0) {
        this.jump();
      }
    }

    // 2. Input movement vector
    let forward = this.touchMove.forward;
    let right = this.touchMove.right;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;

    const isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const targetSpeed = isSprinting ? this.sprintSpeed : this.moveSpeed;

    const moveVector = new THREE.Vector3(right, 0, forward);
    const hasInput = moveVector.lengthSq() > 0.001;

    if (hasInput) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

      // Smooth, responsive acceleration
      const accel = this.isGrounded ? 26.0 : 14.0;
      const targetVx = moveVector.x * targetSpeed;
      const targetVz = moveVector.z * targetSpeed;
      this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetVx, Math.min(1, accel * dt));
      this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetVz, Math.min(1, accel * dt));

      // Smooth avatar rotation facing movement direction
      this.targetRotation = Math.atan2(moveVector.x, moveVector.z);
      this.currentRotation = THREE.MathUtils.lerp(this.currentRotation, this.targetRotation, 0.24);
      this.mesh.rotation.y = this.currentRotation;
    } else {
      // Snappy ground braking & air damping
      const friction = this.isGrounded ? 0.78 : 0.94;
      this.body.velocity.x *= Math.pow(friction, dt * 60);
      this.body.velocity.z *= Math.pow(friction, dt * 60);
    }

    // 3. Sync visual position
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.25,
      this.body.position.z
    );

    // 4. Procedural Character Limb Animation (Walk / Run / Jump / Idle)
    const horizSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.z ** 2);
    const isMoving = horizSpeed > 0.4;

    if (this.currentAvatar === 'voxel_runner') {
      if (isMoving && this.isGrounded) {
        // Step cycle frequency proportional to velocity
        const animSpeed = isSprinting ? 15.0 : 11.0;
        this.walkTime += dt * animSpeed;
        const swingAngle = isSprinting ? 0.85 : 0.64;

        // Alternating leg swing
        this.legL.rotation.x = Math.sin(this.walkTime) * swingAngle;
        this.legR.rotation.x = -Math.sin(this.walkTime) * swingAngle;

        // Alternating arm swing (in opposition to legs)
        this.armL.rotation.x = -Math.sin(this.walkTime) * (swingAngle * 0.85);
        this.armR.rotation.x = Math.sin(this.walkTime) * (swingAngle * 0.85);

        // Subtle torso and head bounce
        this.torsoMesh.position.y = 0.7 + Math.abs(Math.sin(this.walkTime)) * 0.06;
        this.headGroup.position.y = 1.35 + Math.abs(Math.sin(this.walkTime)) * 0.05;

        // Forward tilt during run
        const forwardLean = (horizSpeed / this.sprintSpeed) * 0.14;
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, forwardLean, 0.15);
      } else if (!this.isGrounded) {
        // In-air Jump Pose
        this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, -0.42, 0.2);
        this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0.28, 0.2);
        this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, -0.75, 0.2);
        this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, -0.75, 0.2);
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 0.15);
      } else {
        // Idle Breathing Animation
        this.idleTime += dt * 2.5;
        this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, 0.18);
        this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, 0.18);
        this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, Math.sin(this.idleTime) * 0.06, 0.18);
        this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, -Math.sin(this.idleTime) * 0.06, 0.18);
        this.torsoMesh.position.y = THREE.MathUtils.lerp(this.torsoMesh.position.y, 0.7 + Math.sin(this.idleTime) * 0.02, 0.15);
        this.headGroup.position.y = THREE.MathUtils.lerp(this.headGroup.position.y, 1.35 + Math.sin(this.idleTime) * 0.02, 0.15);
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, 0.15);
      }
    } else if (this.currentAvatar === 'marble_ball') {
      if (hasInput) {
        this.mesh.rotation.x += dt * horizSpeed * 2.2;
      }
    }

    // 5. Smooth 3rd-person follow camera
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
    this.camera.position.lerp(targetCamPos, 0.18);
    this.camera.lookAt(cameraTarget);

    // 6. Fall pit check
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
