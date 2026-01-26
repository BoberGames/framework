import { ProgressBar } from "@pixi/ui";
import { Application, Assets, AssetsManifest, Container, Sprite, Texture, Ticker } from "pixi.js";
import { dispatcher } from "../index";
import { AssetManager } from "../loader/AssetManager";
import gsap from "gsap";
import { Background } from "./Background";
import { CascadeView } from "./slot/CascadeView";
import { StartScreen } from "./StartScreen";
import { LogoView } from "./LogoView";
import { RadialExplosion } from "../utils/ExplosionParticle";
import { getSpine, playAnticipation, playWin, runAnimationMixer } from "../utils/spine-example";
import { Wins } from "./Wins";
import { FreeSpinPopUp } from "./FreeSpinPopUp";

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
            await gsap.from(logo, { y: -300, alpha: 0, duration: 0.5 });
            gsap.to(hacksawLogo, { alpha: 1, duration: 0.5 });

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

        this.progressBar.position.set((this.preLoadContainer.width - this.progressBar.width) * 0.5, 800);
        this.preLoadContainer.addChild(this.progressBar);

        this.progressTicker = () => {
            this.fakeProgress += (this.realProgress - this.fakeProgress) * 0.05;

            if (this.progressBar) this.progressBar.progress = this.fakeProgress;

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

    private async onLoadComplete() {
        console.log("Loading finished (fake delay).");
        const bg = new Background(this.app);
        const cascade = new CascadeView();
        const logo = new LogoView();
        logo.x = bg.children[0].width - logo.width * 0.55;
        logo.y = bg.children[0].height * 0.28;

        this.app.stage.addChild(bg);
        this.app.stage.addChild(cascade);
        this.app.stage.addChild(logo);
        const wins = new Wins();
        this.app.stage.addChild(wins);
        dispatcher.on("WIN", (win)=>{
            wins.showTotalWin(win);
            wins.x = bg.children[0].width * 0.45;
            wins.y = bg.children[0].height * 0.35;
        });

        dispatcher.on("FS_INTRO", ()=>{
            const pop = new FreeSpinPopUp(Texture.from("freespins/FS_INTRO"), {
                x: bg.children[0].width * 0.5,
                y: bg.children[0].height * 0.5,
                scale: 1.2,
            });

            this.app.stage.addChild(pop);
            pop.play();

            pop.eventMode = "static";
            pop.on("pointerdown", ()=>{
                pop.hide()
            });
        })

        dispatcher.on("FS_OUTRO", ()=>{
            const pop = new FreeSpinPopUp(Texture.from("freespins/FS_OUTRO"), {
                x: bg.children[0].width * 0.5,
                y: bg.children[0].height * 0.5,
                scale: 1.2,
            });

            this.app.stage.addChild(pop);
            pop.play();

            pop.eventMode = "static";
            pop.on("pointerdown", ()=>{
                pop.hide()
            });
        })

        const cactus = await getSpine();
        cactus.position.set(bg.children[0].width * 0.17, bg.children[0].height * 0.86);
        cactus.state.setAnimation(0, "IDLE_1_DAY", true);

        this.app.stage.addChild(cactus);

        let mixer: ReturnType<typeof runAnimationMixer> | null = null;

        function startMixer() {
            // safety: never double-start
            mixer?.stop();
            mixer = runAnimationMixer(cactus);
        }

        function stopMixer() {
            mixer?.stop();
            mixer = null;
        }
        startMixer();
        dispatcher.on("ANTICIPATE", async () => {
            stopMixer(); // 🔴 kill ambient loop

            await playAnticipation(cactus);

            startMixer(); // 🟢 fresh mixer instance
        });

        dispatcher.on("SNEEZE", async () => {
            stopMixer(); // 🔴 kill ambient loop

            await playWin(cactus);

            startMixer(); // 🟢 fresh mixer instance
        });
        const part = new RadialExplosion(this.app);
        this.app.stage.addChildAt(part, this.app.stage.getChildIndex(cactus) + 1);

        dispatcher.on("SHOOT", async () => {
            part.explode(
                cactus.x,
                cactus.y - 200,
                [Texture.from("character/spike")],
                80, // number of particles
            );
        });

        this.app.stage.addChild(new StartScreen());
    }
}