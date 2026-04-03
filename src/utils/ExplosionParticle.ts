import { Application, Container, IParticle, ParticleContainer, Texture, Ticker } from "pixi.js";
import { dispatcher } from "../index";

interface ExplosionParticle {
    particle: IParticle;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

export class RadialExplosion extends Container {
    private container: ParticleContainer;
    private particles: ExplosionParticle[] = [];

    constructor(app: Application) {
        super();
        this.container = new ParticleContainer();
        this.addChild(this.container);
        app.ticker.add(this.update);
    }

    /**
     * direction:
     * 0 = right
     * Math.PI * 0.5 = down
     * Math.PI = left
     * -Math.PI * 0.5 = up
     */
    public explode(
        x: number,
        y: number,
        textures: Texture[],
        count = 50,
        direction = -Math.PI / 2 // default: upward blast
    ): void {
        dispatcher.emit("POP");

        const arc = (Math.PI * 2) / 3; // 1/3 of a circle = 120 degrees
        const halfArc = arc / 2;

        for (let i = 0; i < count; i++) {
            // Random angle inside the cone
            const angle = direction + (Math.random() * arc - halfArc);

            // More random shotgun-like speed
            const speed = 40 + Math.random() * 80;

            // Small random spawn offset so particles do not all start from exact same point
            const spawnRadius = Math.random() * 8;
            const spawnAngle = Math.random() * Math.PI * 2;

            const px = x + Math.cos(spawnAngle) * spawnRadius;
            const py = y + Math.sin(spawnAngle) * spawnRadius;

            // Random particle scale
            const scale = 0.7 + Math.random() * 0.8;

            const particle: IParticle = {
                texture: textures[(Math.random() * textures.length) | 0],

                x: px,
                y: py,

                scaleX: scale,
                scaleY: scale,

                // Face movement direction
                rotation: angle - Math.PI / 2,

                anchorX: 0.5,
                anchorY: 0.5,

                color: 0xffffffff,
            };

            this.container.addParticle(particle);

            this.particles.push({
                particle,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                maxLife: 20 + Math.random() * 25,
            });
        }
    }

    private update = (ticker: Ticker): void => {
        const delta = ticker.deltaTime;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const pt = p.particle;

            p.life += delta;

            pt.x += p.vx * delta;
            pt.y += p.vy * delta;

            // Optional tiny drag for more natural spread
            p.vx *= 0.985;
            p.vy *= 0.985;

            // Optional slight shrink near end of life
            const t = 1 - p.life / p.maxLife;
            pt.scaleX = t;
            pt.scaleY = t;

            if (p.life >= p.maxLife) {
                this.container.removeParticle(pt);
                this.particles.splice(i, 1);
            }
        }
    };
}