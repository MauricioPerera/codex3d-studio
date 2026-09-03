import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles = 600;

  private positions: Float32Array;
  private colors: Float32Array;

  constructor(private scene: THREE.Scene) {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Glow dot texture generated on a mini 64x64 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.8, 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  public emitGemBurst(pos: THREE.Vector3, baseColor = 0x38bdf8) {
    const count = 28;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const speed = 2.5 + Math.random() * 4.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)),
        velocity: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + 2.0,
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        color: new THREE.Color(baseColor).lerp(new THREE.Color(0xffffff), Math.random() * 0.5),
        size: 0.3 + Math.random() * 0.3,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      });
    }
  }

  public emitJumpDust(pos: THREE.Vector3) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.8 + Math.random() * 1.5;

      this.particles.push({
        position: pos.clone().setY(pos.y + 0.05),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.4 + Math.random() * 0.6,
          Math.sin(angle) * speed
        ),
        color: new THREE.Color(0xe2e8f0),
        size: 0.25,
        alpha: 0.8,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
  }

  public emitBoosterShockwave(pos: THREE.Vector3) {
    const count = 32;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const speed = 4.0 + Math.random() * 6.0;
      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          speed + 5.0,
          (Math.random() - 0.5) * 2.0
        ),
        color: new THREE.Color(0x34d399).lerp(new THREE.Color(0x10b981), Math.random() * 0.4),
        size: 0.4,
        alpha: 1.0,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3
      });
    }
  }

  public emitConfetti(pos: THREE.Vector3) {
    const count = 80;
    const palette = [0xf59e0b, 0x10b981, 0x06b6d4, 0xec4899, 0x8b5cf6, 0xfacc15];
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const speed = 3.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const colorHex = palette[Math.floor(Math.random() * palette.length)];

      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(theta) * speed,
          6.0 + Math.random() * 5.0,
          Math.sin(theta) * speed
        ),
        color: new THREE.Color(colorHex),
        size: 0.35 + Math.random() * 0.2,
        alpha: 1.0,
        life: 0,
        maxLife: 1.5 + Math.random() * 1.0
      });
    }
  }

  public emitSpeedTrail(pos: THREE.Vector3, vel: THREE.Vector3) {
    if (this.particles.length >= this.maxParticles) return;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4)),
        velocity: vel.clone().multiplyScalar(-0.15).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.8)),
        color: new THREE.Color(0x38bdf8).lerp(new THREE.Color(0xf43f5e), Math.random()),
        size: 0.35,
        alpha: 0.9,
        life: 0,
        maxLife: 0.28
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.velocity.y -= 9.8 * dt; // gravity
      p.velocity.x *= 0.96; // drag
      p.velocity.z *= 0.96;
      p.position.addScaledVector(p.velocity, dt);

      p.alpha = 1.0 - (p.life / p.maxLife);
    }

    // Update buffer attributes
    let idx = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.positions[idx] = p.position.x;
      this.positions[idx + 1] = p.position.y;
      this.positions[idx + 2] = p.position.z;

      const fadeColor = p.color.clone().multiplyScalar(p.alpha);
      this.colors[idx] = fadeColor.r;
      this.colors[idx + 1] = fadeColor.g;
      this.colors[idx + 2] = fadeColor.b;
      idx += 3;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, this.particles.length);
  }

  public clear() {
    this.particles = [];
    this.geometry.setDrawRange(0, 0);
  }

  public dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
