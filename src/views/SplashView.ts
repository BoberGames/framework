import { ProgressBar } from "@pixi/ui";
import { Application, Assets, AssetsManifest, Container, Sprite, Texture, Ticker } from "pixi.js";
import { dispatcher } from "../index";
import { AssetManager } from "../loader/AssetManager";
import gsap from "gsap";
import { Background } from "./Background";
import { CascadeView } from "./slot/Cascade";
import { StartScreen } from "./StartScreen";
export class SplashView {
    public preLoadContainer: Container = new Container();
    private progressBar: ProgressBar | undefined;
    private app: Application;
    private asset: AssetManager;
    private loaded: boolean = false;
    private fakeProgress = 0;
    private realProgress = 0;
    private progressTicker?: (ticker: Ticker) => void;

    constructor(app: Application) {
        this.app = app;
        this.asset = new AssetManager();
    }

    public init = async () => {
        await this.asset.load("assets/loading-manifest.json").then(async () => {
            const background = new Sprite(Texture.from("loading_bg"));

            const logo = new Sprite(Texture.from("loader_logo"));

            const hacksawLogo = new Sprite(Texture.from("loading_hacksaw"));
            hacksawLogo.alpha = 0;

            this.preLoadContainer.addChild(background, logo, hacksawLogo);

            this.app.stage.addChild(this.preLoadContainer);
            await gsap.from(logo, {y: -300, alpha: 0, duration: 0.5});
            gsap.to(hacksawLogo, {alpha: 1, duration: 0.5});

            this.asset.load("assets/manifest.json");
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
            progress: 0,
        });

        this.progressBar.position.set(
            (this.preLoadContainer.width - this.progressBar.width) * 0.5,
            800
        );
        this.preLoadContainer.addChild(this.progressBar);

        this.progressTicker = () => {
            this.fakeProgress += (this.realProgress - this.fakeProgress) * 0.05;

            if (this.progressBar)
                this.progressBar.progress = this.fakeProgress;

            if (this.fakeProgress >= 90 && this.realProgress >= 100 && !this.loaded) {
                this.loaded = true;

                if (this.progressBar) this.progressBar.progress = 100;

                this.onLoadComplete();
                this.stopProgressTicker();
            }
        };

        this.app.ticker.add(this.progressTicker);


        dispatcher.on("progress", (p: number) => {
            this.realProgress = p * 100;
        });
    }


    private stopProgressTicker() {
        if (this.progressTicker) {
            this.app.ticker.remove(this.progressTicker);
            this.progressTicker = undefined;
        }
    }

    private onLoadComplete() {
        console.log("Loading finished (fake delay).");
        const bg = new Background();
        const cascade = new CascadeView();

        this.app.stage.addChild(bg);
        this.app.stage.addChild(cascade);

        this.app.stage.addChild(new StartScreen());
    }
}