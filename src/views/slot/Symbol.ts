import { Container, DestroyOptions, Point, Text, Texture } from "pixi.js";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import gsap from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { dispatcher } from "../../index";
import { getrandomInt } from "../../utils/Utils";
import { SpriteNumberText } from "../../utils/SpriteNumberText";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
export class Symbol extends Container {
    public id: string = "";
    private spine: Spine | null = null;
    private savedScale: number;
    private fnt: any;
    constructor(symId: SymId) {
        super();
        const spineId = ReelCfg.spineIds[symId as keyof typeof ReelCfg.spineIds] ?? "SCATTER";

        // Center the spine object on screen.
        this.spine = Spine.from({
            skeleton: "symbols:data",
            atlas: "symbols:atlas",
            scale: spineId.length > 2 ? 0.45 : 0.6,
        });

        if (spineId === ReelCfg.spineIds.SC || spineId === ReelCfg.spineIds.WD) {
            this.spine.scale.set(1.2);
        }
        this.savedScale = this.spine.scale.x;
        if (
            spineId.length > 2 &&
            spineId !== ReelCfg.spineIds.WD &&
            spineId !== ReelCfg.spineIds.SC &&
            this.id !== "BALLOON"
        ) {
            this.spine.state.data.defaultMix = 0.25;
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.landing, false);
            gsap.delayedCall(3, () => {
                this.startIdleLoop(spineId);
            });
        } else {
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.landing, false);
        }

        this.addChild(this.spine);
        this.id = spineId;

        gsap.registerPlugin(MotionPathPlugin);
    }

    private startIdleLoop(spineId: string): void {
        if (this.id === "BALLOON") return;
        this.spine?.state.setAnimation(0, spineId + ReelCfg.animType.idle, true);
    }

    public setId(symId: string): void {
        // this.img.texture = Assets.get("symbols/" + symId);
    }

    public getId(): string {
        return this.id;
    }

    public showLanding(): void {
        if (this.id === "BALLOON") return;

        if (this.spine) {
            this.spine.state.clearListeners();
            this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);
            this.spine.state.addListener({
                complete: () => {
                    if (
                        this.id.length > 2 &&
                        this.id.length > 2 &&
                        this.id !== ReelCfg.spineIds.WD &&
                        this.id !== ReelCfg.spineIds.SC &&
                        this.id !== "BALLOON"
                    ) {
                        gsap.delayedCall(3, () => {
                            this.startIdleLoop(this.id);
                        });
                    }
                },
            });
        }
    }

    public async showWinAnim(showBalloon: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.spine) {
                this.spine.state.clearListeners();
                this.spine.state.addListener({
                    complete: async () => {
                        if (showBalloon) {
                            this.spine?.scale.set(this.savedScale);
                            await this.showBalloonAnim();
                        }
                        resolve();
                    },
                });
                this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);
            }
        });
    }

    public async playBalloonAfterPop(popSignal: Promise<void>, win: number): Promise<void> {
        if (!this.spine) return;

        // transform to balloon + landing immediately (but no "POP" listener race here)
        this.id = "BALLOON";
        this.spine.state.clearListeners();
        this.spine.scale.set(1);
        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);

        const txt = this.getMulti("x" + win.toString());
        txt.alpha = 0;
        this.addChildAt(txt, 0);

        await popSignal;

        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);
        await gsap.to(txt, { alpha: 1, duration: 0.3 });
        const stage = this.parent?.parent
        if(stage) {
            this.moveToGlobal(txt, stage);

            await gsap.to(txt, {
                duration: 0.8,
                delay: 0.6,
                ease: "power3.in",
                motionPath: {
                    path: [
                        { x: txt.x, y: txt.y },
                        {
                            x: txt.x + gsap.utils.random(-80, 80),
                            y: txt.y - gsap.utils.random(60, 120),
                        },
                        {
                            x: stage.width * 0.1,
                            y: stage.height * 0.1,
                        }
                    ],
                    curviness: 1.5,
                },
            });
        }
        txt.destroy();
    }

    public playWinOnly(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.spine) return resolve();

            this.spine.state.clearListeners();
            this.spine.state.addListener({
                complete: () => resolve(),
            });

            this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);
        });
    }

    private async showBalloonAnim(): Promise<void> {
        if (!this.spine) return;

        this.id = "BALLOON";
        this.spine.state.clearListeners();
        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);

        const txt = this.getMulti("x50") as Container;
        txt.alpha = 0;

        this.addChildAt(txt, 0);

        await new Promise<void>((resolve) => {
            dispatcher.once("POP", async () => {
                gsap.to(txt, { alpha: 1, duration: 0.3 });

                this.spine?.state.setAnimation(0, this.id + ReelCfg.animType.win, false);
                await gsap.to(txt, {
                    width: 0,
                    height: 0,
                    alpha: 0,
                    duration: 0.5,
                    delay: 1,
                });

                txt.destroy();

                resolve();
            });
        });
    }

    public destroy(options?: DestroyOptions) {
        gsap.killTweensOf(this.spine);
        this.spine?.state?.clearListeners();
        if (this.spine) {
            this.removeChild(this.spine);
            this.spine.destroy();
        }
        this.spine = null;
        super.destroy(options);
    }

    private createNonRepeatingRandom(min = 1, max = 15, minGap = 3): () => number {
        let last: number | null = null;

        return function getRandom(): number {
            let value: number;
            let attempts = 0;

            do {
                value = Math.floor(Math.random() * (max - min + 1)) + min;
                attempts++;

                if (attempts > 50) break;
            } while (last !== null && Math.abs(value - last) < minGap);

            last = value;
            return value;
        };
    }

    private getMulti(txt: string): SpriteNumberText {
        const digitTextures: Record<string, Texture> = {
            "0": Texture.from("fonts/multi/multi_0"),
            "1": Texture.from("fonts/multi/multi_1"),
            "2": Texture.from("fonts/multi/multi_2"),
            "9": Texture.from("fonts/multi/multi_9"),
            "3": Texture.from("fonts/multi/multi_3"),
            "4": Texture.from("fonts/multi/multi_4"),
            "5": Texture.from("fonts/multi/multi_5"),
            "6": Texture.from("fonts/multi/multi_6"),
            "7": Texture.from("fonts/multi/multi_7"),
            "8": Texture.from("fonts/multi/multi_8"),
            "x": Texture.from("fonts/multi/multi_x"),
        };


        return new SpriteNumberText({
            digitTextures,
            text: txt,
            spacing: 2,
            align: "center",
            maxHeight: 70, // optional: auto fit height
        });
    }

    public moveToGlobal(child: any, targetContainer: Container): void {
        const globalPos = child.getGlobalPosition(new Point());

        child.parent?.removeChild(child);

        const localPos = targetContainer.toLocal(globalPos);

        child.position.copyFrom(localPos);
        targetContainer.addChild(child);
    }
}
