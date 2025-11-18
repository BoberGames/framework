import { ProgressBar } from "@pixi/ui";
import { Application, Container } from "pixi.js";
import { dispatcher } from "../index";
import { AssetManager } from "../loader/AssetManager";

export class SplashView {
    public static preLoadContainer: Container = new Container();
    private progressBar: ProgressBar;
    private app: Application;
    private asset: AssetManager;
    private loaded: boolean = false;

    constructor(app: Application) {
        this.app = app;
        this.asset = new AssetManager();
        this.init();
    }

    private init = async () => {
        await this.asset.load('./loader/loading-manifest.json').then(() => {
            const backgroundTexture = isLandscape() ? 'd_loading_bg' : 'p_loading_bg';
            const background = new Sprite(Texture.from(backgroundTexture));
            background.name = 'background';

            const staticLogo = new Sprite(Texture.from('anymaplay_logo'));
            staticLogo.name = 'anymaplayLogo';
            staticLogo.anchor.set(0.5);
            staticLogo.position.set(0,0);

            const character = new Spine(Assets.get('character').spineData);
            character.name = 'character';
            character.position.set(this.positions.character[this.screenLayout].x, this.positions.character[this.screenLayout].y);
            character.state.setAnimation(0, 'idle', true);

            PreloadView.preLoadContainer.addChild(background, logo, character, staticLogo);

            ApplicationBase.instance.on(ON_CONFIG_UPDATE, (data: any) => {
                this.asset.load('./assets/renderer/base/manifest.json');
                ApplicationBase.instance.emit(SET_INIT_DATA, data);
                this.app.stage.addChild(PreloadView.preLoadContainer);
                this.showProgressBar();
            });
        });
    }

    private createStartBtn(): PIXI.AnimatedSprite {
        const spritesheet = PIXI.Assets.get('continue_btn');
        const frames = [];
        for (let i in spritesheet.textures) {
            frames.push(spritesheet.textures[i]);
        }
        const continueBtn = new PIXI.AnimatedSprite(frames);

        continueBtn.alpha = 0;
        continueBtn.anchor.set(0.5);
        continueBtn.scale.set(0.8);
        continueBtn.name = 'continueBtn';
        PreloadView.preLoadContainer.addChild(continueBtn);

        this.setStartBtnPosition();
        continueBtn.eventMode = "static";
        continueBtn.cursor = "grab";
        continueBtn.on(ON_POINTER_DOWN, () => {
            ApplicationBase.instance.emit(ON_START_GAME);
            gsap.killTweensOf(continueBtn);
            this.app.stage.removeChild(continueBtn);
            continueBtn.destroy();
        });

        return continueBtn;
    }

    private setStartBtnPosition(): void {
        const continueBtn = PreloadView.preLoadContainer.getChildByName('continueBtn') as PIXI.AnimatedSprite;
        continueBtn.position.set(this.positions.continueBtn[this.screenLayout].x, this.positions.continueBtn[this.screenLayout].y);
    }

    private showProgressBar() {
        this.progressBar = new ProgressBar({
            bg: 'loading_base',
            fill: 'loading_bar',
            fillPaddings: { left: 20, top: 10 },
            progress: this.asset.getProgress()
        });
        this.progressBar.pivot.set(0.5);
        this.progressBar.name = 'loadingBar';

        const endSprite = new PIXI.Sprite(PIXI.Texture.from('loading_shine'));
        endSprite.pivot.set(0.5);
        endSprite.anchor.set(0.5);
        endSprite.y = 25;
        endSprite.x = 0;
        this.progressBar.addChild(endSprite);
        this.progressBar.position.set(this.positions.loadingBar[this.screenLayout].x, this.positions.loadingBar[this.screenLayout].y);
        PreloadView.preLoadContainer.addChild(this.progressBar);

        ApplicationBase.instance.on(ON_UPDATE_PROGRESS, async (p: any) => {
            if (this.loaded) return;

            this.progressBar.progress = p * 100;
            endSprite.x = Math.min((this.progressBar.width - 25) * p, 725);
            if (this.progressBar.progress / 100 === 1) {
                this.loaded = true;

                const btn = this.createStartBtn();
                gsap.to(this.progressBar, { alpha: 0, ease: "power3.in", duration: 0.5 });
                await gsap.to(btn, { alpha: 1, ease: "power3.out", duration: 0.5, delay: 0.3 });
                btn.play();

                PreloadView.preLoadContainer.removeChild(this.progressBar);
            }
        })
    }
}