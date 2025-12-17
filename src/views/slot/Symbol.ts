import { Container, DestroyOptions, Text } from "pixi.js";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import gsap from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { dispatcher } from "../../index";

export class Symbol extends Container {
    public id: string = "";
    private spine: Spine | null = null;

    constructor(symId: SymId) {
        super();
        const spineId = ReelCfg.spineIds[symId as keyof typeof ReelCfg.spineIds] ?? "SCATTER";

        // Center the spine object on screen.
        this.spine = Spine.from({
            skeleton: "symbols:data",
            atlas: "symbols:atlas",
            scale: spineId.length > 2 ? 0.45 : 0.6,
        });

        if (
            spineId.length > 2 &&
            spineId !== ReelCfg.spineIds.WD &&
            spineId !== ReelCfg.spineIds.SC &&
            this.id !== "BALLOON"
        ) {
            this.spine.state.data.defaultMix = 0.25;
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.landing, false);
            gsap.delayedCall(3, ()=>{this.startIdleLoop(spineId)});
        } else {
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.landing, false);
        }

        this.addChild(this.spine);
        this.id = spineId;
    }

    private startIdleLoop(spineId: string): void {
        this.spine?.state.setAnimation(
            0,
            spineId + ReelCfg.animType.idle,
            true
        );
    }


    public setId(symId: string): void {
        // this.img.texture = Assets.get("symbols/" + symId);
    }

    public getId(): string {
        return this.id;
    }

    public showLanding(): void {
        if (this.spine) {
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
                        gsap.delayedCall(3, ()=>{this.startIdleLoop(this.id)});
                    }
                },
            });
        }
    }

    public async showWinAnim(showBalloon: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.spine) {
                this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);

                this.spine.state.addListener({
                    complete: async () => {
                        if (showBalloon) {
                            await this.showBalloonAnim();
                        }

                        requestAnimationFrame(() => {
                            resolve();
                        });
                    },
                });
            }
        });
    }

    private async showBalloonAnim(): Promise<void> {
        if (!this.spine) return;

        this.id = "BALLOON";
        this.spine.state.clearListeners();
        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);
        dispatcher.emit("SNEEZE");

        const txt: Text = new Text("50X", {
            fontFamily: "Arial",
            fontSize: 80,
            fill: 0xf6ff00,
            fontWeight: "bold",
            stroke: { color: '#ffffff', width: 5, join: 'round' }
        });

        txt.anchor.set(0.5);
        this.addChildAt(txt, 0);

        await new Promise<void>((resolve) => {
            dispatcher.once("POP", async () => {
                this.spine?.state.setAnimation(
                    0,
                    this.id + ReelCfg.animType.win,
                    false
                );

                await gsap.to(txt, {
                    width: 200,
                    height: 200,
                    alpha: 0,
                    duration: 0.5,
                    delay: 1,
                });

                txt.destroy();

                await gsap.delayedCall(1.5, () => {});
                resolve();
            });
        });
    }


    public destroy(options?: DestroyOptions) {
        gsap.killTweensOf(this.spine)
        this.spine?.state?.clearListeners();
        if(this.spine) {
            this.removeChild(this.spine);
            this.spine.destroy();
        }
        this.spine = null;
        super.destroy(options);
    }

    private createNonRepeatingRandom(
        min = 1,
        max = 15,
        minGap = 3
    ): () => number {
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

}
