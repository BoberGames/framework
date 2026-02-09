import { Application, Container, Graphics } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { BangupComponent } from "./Bangup";
import { WinMaps } from "./WinManagerTypes";
import gsap from "gsap";
import { dispatcher } from "../../index";
export const BIG_WIN_MULTIPLIER: number = 10;
export const SUPER_WIN_MULTIPLIER: number = 20;
export const MEGA_WIN_MULTIPLIER: number = 30;
export const WIN_TYPES = {
    BIG: 'BIGWIN',
    SUPER: 'SUPERWIN',
    MEGA: 'MEGAWIN',
};
export class BigWinsScreen extends Container {
    public static container: Container = new Container();

    private readonly thresholds: string[] = ['BIGWIN', 'SUPERWIN', 'MEGAWIN'];
    private spineContainer!: Container;
    private currentIndex: number = 0;
    private indexToReach!: number;
    private isSkipping: boolean = false;
    private delayedCallRef: gsap.core.Tween | null = null;
    private isActive: boolean = false;
    private spineElement: Spine;
    private lastOrientation: 'landscape' | 'portrait' = 'landscape';

    constructor(app: Application) {
        super();
        app.stage.addChild(BigWinsScreen.container);
        // lizzards.state.setAnimation(0, "IDLE", true);
        this.spineElement = Spine.from({
            skeleton: "bigwins:data",
            atlas:    "bigwins:atlas"
        });

        this.addChild(this.spineElement);
    }

    private get currentThreshold(): string {
        return this.thresholds[this.currentIndex];
    }

    public init(): void {
        this.spineContainer = this;
        const winType = this.getWinType(1999) as keyof typeof WinMaps;
        this.indexToReach = 0;
        this.spineElement.alpha = 0;
    }

    public getWinType(win: number): string  {

        const multiplier = win / 1.2;

        switch (true) {
            case multiplier >= MEGA_WIN_MULTIPLIER:
                return WIN_TYPES.MEGA
            case multiplier >= SUPER_WIN_MULTIPLIER:
                return WIN_TYPES.SUPER
            case multiplier >= BIG_WIN_MULTIPLIER:
                return WIN_TYPES.BIG

            default:
                return WIN_TYPES.BIG
        }
    }

    public removeCreatedComponents(): void {
        const container = BigWinsScreen.container;
        const fade = container.getChildByName('fade');
        if (fade) {
            container.removeChild(fade);
        }
        const bangupComponent = this.spineContainer.getChildByName('bangup');
        if (bangupComponent) {
            this.spineContainer.removeChild(bangupComponent);
        }
    }

    private createBackground(): void {
        const backgroundFade = new Graphics();
        const isLandscapeMode = true;

        const w = isLandscapeMode ? this.width : this.height;
        const h = isLandscapeMode ? this.height : this.width;

        backgroundFade.name = 'fade';
        backgroundFade.beginFill(0x000000, 0.7);
        backgroundFade.drawRect(0, 0, w, h);
        backgroundFade.endFill();
        backgroundFade.scale.set(1); // Scale is adjusted due to the outer container

        BigWinsScreen.container.addChildAt(backgroundFade, 0);
    }

    public showWinAnimation(win: number): void {
        BigWinsScreen.container.eventMode = "static";
        this.isActive = true;
        const winToShow = win;
        this.spineElement.alpha = 1;

        // Update the target win threshold if an override is provided
        if (win) {
            this.indexToReach = 2;
        }

        // For the first threshold, initialize sounds and graphics
        if (this.currentIndex === 0) {
            this.prepareInitialAnimation(winToShow);
        } else {
            // Transition sounds for subsequent win thresholds
        }

        this.spineElement.state.setAnimation(0, `${this.getOrientation()}${this.currentThreshold}_IN`, false);

        this.spineElement.state.addListener({
            complete: () => {
                this.handleAnimationComplete(winToShow);
            },
        });
    }

    private prepareInitialAnimation(winToShow: number): void {
        BigWinsScreen.container.alpha = 1;
        this.spineContainer.alpha = 1;
        // this.createBackground();

        let bangupComponent = new BangupComponent();
        bangupComponent.name = 'bangup';
        this.spineContainer.addChild(bangupComponent);
        this.resizeBangup();
        bangupComponent.startBangup(1000000);
    }

    private handleAnimationComplete(winToShow: number = 1999): void {
        this.isSkipping = false;
        if (this.delayedCallRef) {
            this.delayedCallRef.kill();
            this.delayedCallRef = null;
        }

        const bangupDuration = 5;
        const delay = bangupDuration / (this.indexToReach + 1);

        this.delayedCallRef = gsap.delayedCall(delay, async () => {
            await this.skipToNextWinThreshold();
        });

        this.spineElement.state.clearListeners();
        this.enableSkip();
        this.spineElement.state.setAnimation(0, `${this.getOrientation()}${this.currentThreshold}_LOOP`, true);
    }

    public resizeBangup(): void {
        const bangup = this.spineContainer?.getChildByName('bangup') as BangupComponent;
        return;

        const bounds = bangup.getLocalBounds();
        const originalWidth = bounds.width;
        const originalHeight = bounds.height;
        const isLandscapeMode = true

        const maxWidth = isLandscapeMode ? this.width * 0.827 : this.height * 0.943;
        const maxHeight = isLandscapeMode ? this.height * 0.18 : this.width * 0.065;
        const scale = Number(Math.min(maxWidth / originalWidth, maxHeight / originalHeight).toFixed(2));

        bangup.scale.set(scale);
        bangup.y = isLandscapeMode ? this.height * 0.22 : this.width * 0.11;
    }

    public reSize(): void {
        this.updateFadeDimensions();

        if (this.spineContainer && this.isActive) {
            this.spineContainer.alpha = 1;
            this.spineElement.state.setAnimation(0, `${this.getOrientation()}${this.currentThreshold}_LOOP`, true);
        }

        const currentOrientation = 'landscape';
        if (this.lastOrientation !== currentOrientation) {
            this.lastOrientation = currentOrientation;
            this.resizeBangup();
        }
    }

    private updateFadeDimensions(): void {
        const fade = BigWinsScreen.container.getChildByName('fade') as Graphics;
        if (!fade) return;

        fade.pivot.set(0.5);
        fade.position.set(0, 0);
        const isLandscapeMode = true;
        fade.width = isLandscapeMode ? this.width : this.height;
        fade.height = isLandscapeMode ? this.height : this.width;
    }

    private enableSkip(): void {
        this.spineElement.eventMode = 'static';
        this.spineElement.cursor = 'pointer';
        this.spineElement.once("pointerdown", async () => await this.skipAction());
        dispatcher.once("next_bigwin", async () => await this.skipAction());
    }

    private async skipAction(): Promise<void> {
        if (this.delayedCallRef) {
            this.delayedCallRef.kill();
        }
        await this.skipToNextWinThreshold();
    }

    public async skipToNextWinThreshold(): Promise<void> {
        if (this.isSkipping) return;
        this.isSkipping = true;

        this.spineElement.state.clearListeners();

        if (this.currentIndex < this.indexToReach) {
            await this.hideWinAnimation();
            this.currentIndex++;
            this.spineContainer.alpha = 1;
            this.showWinAnimation(1999);
        } else {
            await this.onAllAnimationsComplete();
        }
    }

    private async waitForSpineClick(): Promise<void> {
        return new Promise((resolve) => {
            const onClick = () => {
                this.spineElement.eventMode = "none";
                resolve();
            };
            this.spineElement.once("pointerdown", onClick);
            dispatcher.once("next_bigwin", onClick);
        });
    }

    private async onAllAnimationsComplete(): Promise<void> {

        await this.waitForSpineClick();
        this.isActive = false;

        await this.hideWinAnimation();

        this.currentIndex = 0;
        BigWinsScreen.container.alpha = 0;
        dispatcher.emit("bigwin_complete");
        BigWinsScreen.container.eventMode = "none";
    }

    private async hideWinAnimation(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.spineElement.state.setAnimation(0, `${this.getOrientation()}${this.currentThreshold}_OUT`, false);
            this.spineElement.state.addListener({
                complete: () => {
                    requestAnimationFrame(() => {
                        this.spineElement.state.clearListeners();
                        resolve();
                        if(this.isActive) return
                        this.spineContainer.alpha = 0;
                        const bangupComponent = this.spineContainer.getChildByName('bangup');
                        bangupComponent?.destroy();
                    });
                },
            });
        });
    }

    private getOrientation(): string {
        return "";
    }
}
