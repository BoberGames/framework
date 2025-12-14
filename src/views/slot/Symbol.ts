import { Container, DestroyOptions, Text } from "pixi.js";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import gsap from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class Symbol extends Container {
    public id: string = "";
    private spine: Spine;

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
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.idle, true);
        } else {
            this.spine.state.setAnimation(0, spineId + ReelCfg.animType.landing, false);
        }

        // this.img.anchor.set(0.5, 0.5);
        this.addChild(this.spine);
        this.id = spineId;
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
                        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.idle, true);
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
        if (this.spine) {
            this.id = "BALLOON";
            this.spine.state.clearListeners();
            this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);
            await gsap.delayedCall(1.5, () => {});
            const txt: Text = new Text("Kyp", {
                fontFamily: "Arial",
                fontSize: 80,
                fill: 0xffffff,
                fontWeight: "bold",
                stroke: { color: '#4a1850', width: 5, join: 'round' }
            })
            txt.anchor.set(0.5);
            this.addChild(txt);
            this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);
            await gsap.to(txt, {width: 200, height: 200, alpha: 0, duration: .5, delay: 1});
            txt.destroy();
            await gsap.delayedCall(.5, () => {});
        }
    }

    public destroy(options?: DestroyOptions) {
        super.destroy(options);
    }
}
