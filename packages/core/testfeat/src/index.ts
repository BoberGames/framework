import { Graphics, Application } from 'pixi.js';

export class TestFeature {
    id = 'testFeature';

    init(app: Application) {
        const g = new Graphics();
        g.rect(0, 0, 600, 500)
        g.fill(0xff0000, 0.4);
        app.stage.addChild(g);
    }
}