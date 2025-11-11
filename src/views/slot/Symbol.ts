import { Assets, Container, DestroyOptions, Sprite } from "pixi.js";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import gsap from "gsap";

export class Symbol extends Container {
    public id: string = "";
    private img: Sprite;

    constructor(symId: SymId) {
        super();
        const spineId = ReelCfg.spineIds[symId as keyof typeof ReelCfg.spineIds] ?? "SCATTER";

        this.img = new Sprite(Assets.get("symbols/" + spineId));
        this.img.anchor.set(0.5, 0.5);
        this.addChild(this.img);
    }

    public setId(symId: string): void {
        this.img.texture = Assets.get("symbols/" + symId);
    }

    public getId(): string {
        return this.id;
    }

    public showLanding(): void {

    }

    public async showWinAnim(): Promise<void> {}

    public destroy(options?: DestroyOptions) {
        super.destroy(options);
    }
}
