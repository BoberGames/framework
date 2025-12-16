import "./style.css";
import { Application, Assets, AssetsManifest, EventEmitter } from "pixi.js";
import "@esotericsoftware/spine-pixi-v8";

import { Background } from "./views/Background";
import { CascadeView } from "./views/slot/CascadeView";
import { SplashView } from "./views/SplashView";

export const dispatcher = new EventEmitter();

const gameWidth = 1920;
const gameHeight = 1080;

// Debounce timer for mobile rotation
let resizeTimeout: number;

console.log(
    `%cPixiJS V8\nTypescript Boilerplate%c ${VERSION} %chttp://www.pixijs.com %c❤️`,
    "background: #ff66a1; color: #FFFFFF; padding: 2px 4px; border-radius: 2px; font-weight: bold;",
    "color: #D81B60; font-weight: bold;",
    "color: #C2185B; font-weight: bold; text-decoration: underline;",
);

(async () => {

    const canvas = document.createElement("canvas");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const app = new Application({
        resolution: pixelRatio,
        autoDensity: true,
        antialias: true,
        powerPreference: "high-performance",
        backgroundColor: 0x000000,
        view: canvas,
    });

    // await window load
    await new Promise((resolve) => window.addEventListener("load", resolve));

    await app.init({
        width: gameWidth,
        height: gameHeight,
    });

    document.body.appendChild(app.canvas);

    const splash = new SplashView(app);
    resizeCanvas();

    await splash.init()

    // resize handlers
    window.onresize = () => resizeCanvas();
    window.onorientationchange = () => resizeCanvas();
    window.visualViewport?.addEventListener("resize", () => resizeCanvas());
    window.visualViewport?.addEventListener("scroll", () => resizeCanvas());
    window.addEventListener("orientationchange", () => resizeCanvas());
    window.addEventListener("resize", () => resizeCanvas());


    // await loadGameAssets();

    async function loadGameAssets(): Promise<void> {
        // const manifest = {
        //     bundles: [
        //         { name: "sheet", assets: [{ alias: "sheet", src: "./assets/sheet.json" }] },
        //     ],
        // } satisfies AssetsManifest;
        //
        // await Assets.init({ manifest });
        // await Assets.loadBundle(["sheet"]);
        //

        // const bg = new Background();
        const cascade = new CascadeView();

        // app.stage.addChild(bg);
        app.stage.addChild(cascade);


    }

    /**
     * Debounced resize for mobile browsers
     */
    function resizeCanvas(): void {
        applyResize();
    }

    /**
     * Main resize logic (perfect 16:9 scaling + centering)
     */
    function applyResize() {
        const vp = window.visualViewport;

        const vw = vp ? vp.width : window.innerWidth;
        const vh = vp ? vp.height : window.innerHeight;

        const scale = Math.min(
            vw / gameWidth,
            vh / gameHeight
        );

        const displayWidth = gameWidth * scale;
        const displayHeight = gameHeight * scale;

        // Device pixel ratio
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const realW = vw * dpr;
        const realH = vh * dpr;

        // ⚠️ PIXI v8 → Use app.canvas instead of renderer.view
        app.canvas.width = realW;
        app.canvas.height = realH;

        // Set CSS size (visible size)
        app.canvas.style.width = vw + "px";
        app.canvas.style.height = vh + "px";

        // Update renderer resolution
        app.renderer.resolution = dpr;
        app.renderer.resize(vw, vh);

        // Scale game
        app.stage.scale.set(scale);

        // Center game
        app.stage.x = (vw - displayWidth) / 2;
        app.stage.y = (vh - displayHeight) / 2;
    }




})();
