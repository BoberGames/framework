import { Assets, Container, DestroyOptions, Graphics, Sprite } from "pixi.js";
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
        this.id = symId;
    }

    public setId(symId: string): void {
        this.img.texture = Assets.get("symbols/" + symId);
    }

    public getId(): string {
        return this.id;
    }

    public showLanding(): void {

    }

    public async showWinAnim(): Promise<void> {
        const debug = new Graphics();

        debug.beginFill(0x00ff00, 0.6);
        debug.drawRect(-this.width * 0.5, -this.height * 0.5, this.width, this.height);
        debug.endFill();
        this.addChildAt(debug, 0);
        await gsap.delayedCall(1, () => {})

        return gsap.to(this.scale, { x: 0, y: 0, duration: 0.5 }).then() as unknown as Promise<void>;
    }

    public destroy(options?: DestroyOptions) {
        super.destroy(options);
    }
}
