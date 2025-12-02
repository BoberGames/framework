import { Assets, Container, DestroyOptions, Graphics, Sprite } from "pixi.js";
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
            atlas:    "symbols:atlas",
            scale: 0.5,
        });

        if(spineId.length > 2) {
            this.spine.state.setAnimation(0, spineId + " idle", true);
        } else {
            this.spine.state.setAnimation(0, spineId + " land", false);
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
        if(this.spine) {
            this.spine.state.setAnimation(0, this.id + " land", false);
            this.spine.state.addListener({
                complete: () => {
                    if(this.id.length > 2) {
                        this.spine.state.setAnimation(0, this.id + " idle", true);
                    }
                }
            });
        }
    }

    public async showWinAnim(): Promise<void> {
        return new Promise<void>((resolve) => {
            if(this.spine) {
                this.spine.state.setAnimation(0, this.id + " win", false);

                this.spine.state.addListener({
                    complete: () => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    }
                });
            }

        });
    }

    public destroy(options?: DestroyOptions) {
        super.destroy(options);
    }
}
