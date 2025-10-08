import { Application } from 'pixi.js';
import { Engine } from 'core-engine';
import { ReelsFeature } from 'core-reels';

const app = new Application();

await app.init({ backgroundColor: 0x000000, width: 800, height: 600 });
document.body.appendChild(app.canvas);

const engine = new Engine(app, [
    new ReelsFeature(),
]);

engine.start();
