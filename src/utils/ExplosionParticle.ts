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

    public explode(
        x: number,
        y: number,
        textures: Texture[],
        count = 50
    ): void {
        const step = (Math.PI * 2) / count;
        dispatcher.emit("POP");
        for (let i = 0; i < count; i++) {
            const angle = i * step;
            const speed = 60 + Math.random() * 6;

            const particle: IParticle = {
                texture: textures[(Math.random() * textures.length) | 0],

                x,
                y,

                scaleX: 1,
                scaleY: 1,

                // 🔥 POINTS OUTWARDS
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
                maxLife: 40 + Math.random() * 20,
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

            if (p.life >= p.maxLife) {
                this.container.removeParticle(pt);
                this.particles.splice(i, 1);
            }
        }
    };
}
