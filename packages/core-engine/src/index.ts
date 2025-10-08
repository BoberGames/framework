import { Application } from 'pixi.js';

export interface Feature {
    id: string;
    init(app: Application): void | Promise<void>;
    destroy?(): void;
}

export class Engine {
    constructor(private app: Application, private features: Feature[]) {}

    async start() {
        this.app.start();

        for (const f of this.features) await f.init(this.app);
        console.log('Engine started');
    }

    destroy() {
        for (const f of this.features) f.destroy?.();
        this.app.destroy(true);
    }
}
