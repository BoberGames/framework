import { ProgressBar } from "@pixi/ui";
import { Application, Assets, AssetsManifest, Container, Sprite, Texture } from "pixi.js";
import { dispatcher } from "../index";
import { AssetManager } from "../loader/AssetManager";
import gsap from "gsap";
export class SplashView {
    public preLoadContainer: Container = new Container();
    private progressBar: ProgressBar | undefined;
    private app: Application;
    private asset: AssetManager;
    private loaded: boolean = false;

    constructor(app: Application) {
        this.app = app;
        this.asset = new AssetManager();
    }

    public init = async () => {
        await this.asset.load("assets/loading-manifest.json").then(async () => {
            const background = new Sprite(Texture.from("loading_bg"));
            background.name = "background";

            const logo = new Sprite(Texture.from("loader_logo"));
            logo.name = "loading_logo";
            logo.position.set(0, 0);

            this.preLoadContainer.addChild(background, logo);
            this.app.stage.addChild(this.preLoadContainer);

            this.asset.load("./assets/manifest.json");
            this.showProgressBar();
        });
    };

    // private createStartBtn(): PIXI.AnimatedSprite {
    //     const spritesheet = PIXI.Assets.get('continue_btn');
    //     const frames = [];
    //     for (let i in spritesheet.textures) {
    //         frames.push(spritesheet.textures[i]);
    //     }
    //     const continueBtn = new PIXI.AnimatedSprite(frames);
    //
    //     continueBtn.alpha = 0;
    //     continueBtn.anchor.set(0.5);
    //     continueBtn.scale.set(0.8);
    //     continueBtn.name = 'continueBtn';
    //     PreloadView.preLoadContainer.addChild(continueBtn);
    //
    //     this.setStartBtnPosition();
    //     continueBtn.eventMode = "static";
    //     continueBtn.cursor = "grab";
    //     continueBtn.on(ON_POINTER_DOWN, () => {
    //         ApplicationBase.instance.emit(ON_START_GAME);
    //         gsap.killTweensOf(continueBtn);
    //         this.app.stage.removeChild(continueBtn);
    //         continueBtn.destroy();
    //     });
    //
    //     return continueBtn;
    // }

    // private setStartBtnPosition(): void {
    //     const continueBtn = PreloadView.preLoadContainer.getChildByName('continueBtn') as PIXI.AnimatedSprite;
    //     continueBtn.position.set(this.positions.continueBtn[this.screenLayout].x, this.positions.continueBtn[this.screenLayout].y);
    // }

    private showProgressBar() {
        this.progressBar = new ProgressBar({
            bg: "loader_frame",
            fill: "loader_bar",
            fillPaddings: { left: 0, top: 0 },
            progress: this.asset.getProgress(),
        });
        this.progressBar.pivot.set(0.5);
        this.progressBar.name = "loadingBar";

        this.progressBar.position.set(960, 800);
        this.preLoadContainer.addChild(this.progressBar);

        dispatcher.on("progress", async (p: any) => {
            if (this.loaded) return;
            if (!this.progressBar) return;

            this.progressBar.progress = p * 100;
            if (this.progressBar.progress / 100 === 1) {
                this.loaded = true;

                // const btn = this.createStartBtn();
                // gsap.to(this.progressBar, { alpha: 0, ease: "power3.in", duration: 0.5 });
                // await gsap.to(btn, { alpha: 1, ease: "power3.out", duration: 0.5, delay: 0.3 });
                // btn.play();

                this.preLoadContainer.removeChild(this.progressBar);
            }
        });
    }
}