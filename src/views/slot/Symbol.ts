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
            scale: spineId.length > 2 ? 0.45 : 0.6,
        });

        if(spineId.length > 2 && spineId !== ReelCfg.spineIds.WD && spineId !== ReelCfg.spineIds.SC) {
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
        if(this.spine) {
            this.spine.state.setAnimation(0, this.id + ReelCfg.animType.landing, false);
            this.spine.state.addListener({
                complete: () => {
                    if(this.id.length > 2 && this.id.length > 2 && this.id !== ReelCfg.spineIds.WD && this.id !== ReelCfg.spineIds.SC) {
                        this.spine.state.setAnimation(0, this.id + ReelCfg.animType.idle, true);
                    }
                }
            });
        }
    }

    public async showWinAnim(): Promise<void> {
        return new Promise<void>((resolve) => {
            if(this.spine) {
                this.spine.state.setAnimation(0, this.id + ReelCfg.animType.win, false);

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
