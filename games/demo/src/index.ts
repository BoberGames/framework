import { Application } from 'pixi.js';


const app = new Application({ width: 800, height: 600, backgroundColor: 0x333333 });
document.body.appendChild(app.view as HTMLCanvasElement);

const engine = new TestFeature();
engine.init(app);
