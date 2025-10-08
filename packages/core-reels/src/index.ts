import { Graphics, Application } from 'pixi.js';
import type { Feature } from 'core-engine';

export class ReelsFeature implements Feature {
    id = 'reels';

    init(app: Application) {
        const g = new Graphics();
        g.rect(100, 100, 500, 600);
        g.fill(0xff0000, 0.4);
        app.stage.addChild(g);
        console.log('ReelsFeature initialized');
    }
}
