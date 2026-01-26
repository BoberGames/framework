import { Container, Sprite, Texture, type DestroyOptions } from "pixi.js";
import gsap from "gsap";

export type PopupSpriteOptions = {
    x: number;
    y: number;
    scale?: number;          // final scale
    alpha?: number;          // final alpha
    zIndex?: number;
    destroyOnHide?: boolean; // default true
};

export class FreeSpinPopUp extends Container {
    public sprite: Sprite;

    private showTl?: gsap.core.Timeline;
    private idleTl?: gsap.core.Timeline;
    private hiding = false;

    private baseY = 0;
    private opts: Required<Omit<PopupSpriteOptions, "x" | "y">> & Pick<PopupSpriteOptions, any>;

    constructor(texture: Texture, options: PopupSpriteOptions) {
        super();

        this.opts = {
            scale: options.scale ?? 1,
            alpha: options.alpha ?? 1,
            zIndex: options.zIndex ?? 999,
            destroyOnHide: options.destroyOnHide ?? true,
        };

        this.zIndex = this.opts.zIndex;

        this.sprite = new Sprite(texture);
        this.sprite.position.set(options.x, options.y);
        this.sprite.alpha = 0;

        // simple center-pivot so it scales from the middle
        this.sprite.anchor?.set?.(0.5); // if Sprite supports anchor (it does)
        // fallback if you prefer pivot:
        // this.sprite.pivot.set(this.sprite.width * 0.5, this.sprite.height * 0.5);

        this.addChild(this.sprite);
    }

    /** Show -> Idle (loop) */
    public play(): void {
        gsap.killTweensOf([this.sprite, this.sprite.scale]);

        const { scale, alpha } = this.opts;

        // start state
        this.sprite.alpha = 0;
        this.sprite.scale.set(scale * 0.8);
        this.sprite.rotation = -0.05;

        // SHOW
        this.showTl = gsap
            .timeline({ defaults: { overwrite: "auto" } })
            .to(this.sprite, { alpha, duration: 0.18, ease: "power2.out" }, 0)
            .to(this.sprite.scale, { x: scale * 1.1, y: scale * 1.1, duration: 0.22, ease: "back.out(2.2)" }, 0)
            .to(this.sprite, { rotation: 0, duration: 0.3, ease: "power3.out" }, 0)
            .to(this.sprite.scale, { x: scale, y: scale, duration: 0.12, ease: "power2.out" }, 0.2)
            .add(() => this.startIdle());

        // optional auto-hide
        if (this.opts.autoHideMs && this.opts.autoHideMs > 0) {
            gsap.delayedCall(this.opts.autoHideMs / 1000, () => void this.hide());
        }
    }

    /** Subtle float + pulse loop */
    private startIdle(): void {
        this.baseY = this.sprite.y;

        this.idleTl?.kill();
        this.idleTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { overwrite: "auto" } });

        this.idleTl
            .to(this.sprite, { y: this.baseY - 10, duration: 1.2, ease: "sine.inOut" }, 0)
            .to(this.sprite.scale, { x: this.opts.scale * 1.03, y: this.opts.scale * 1.03, duration: 1.2, ease: "sine.inOut" }, 0);
    }

    /** Hide + (optionally) destroy */
    public async hide(): Promise<void> {
        if (this.hiding) return;
        this.hiding = true;

        this.showTl?.kill();
        this.idleTl?.kill();

        const { scale } = this.opts;

        await gsap.timeline({ defaults: { overwrite: "auto" } })
            .to(this.sprite, { y: this.sprite.y + 8, duration: 0.16, ease: "power2.in" }, 0)
            .to(this.sprite.scale, { x: scale * 0.92, y: scale * 0.92, duration: 0.16, ease: "power2.in" }, 0)
            .to(this.sprite, { alpha: 0, duration: 0.18, ease: "power2.in" }, 0)
            .then();

        this.destroy({ children: true });
    }

    public override destroy(options?: DestroyOptions | boolean): void {
        this.showTl?.kill();
        this.idleTl?.kill();
        gsap.killTweensOf([this.sprite, this.sprite.scale]);
        super.destroy(options as any);
    }
}
