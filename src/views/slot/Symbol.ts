import { Container, DestroyOptions, Point, Text, Texture } from "pixi.js";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import gsap from "gsap";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { dispatcher } from "../../index";
import { getrandomInt } from "../../utils/Utils";
import { SpriteNumberText } from "../../utils/SpriteNumberText";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
type FlyToOptions = {
    delay?: number;
    targetX: number;
    targetY: number;
    // feel tuning
    minArc?: number;       // px
    maxArc?: number;       // px
    overshootPx?: number;  // px
    startScale?: number;   // if omitted, uses txt.scale.x
    endScale?: number;     // final scale
    travel?: number;       // main travel duration
};

export class Symbol extends Container {
    public id: string = "";
    private spine: Spine | null = null;
    private savedScale: number;
    private fnt: any;
    constructor(symId: SymId) {
        super();
        const spineId = ReelCfg.spineIds[symId as keyof typeof ReelCfg.spineIds] ?? "SCATTER";

        gsap.registerPlugin(MotionPathPlugin);

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

            await this.flyTextToTarget(txt, {
                delay: 0,
                targetX: stage.width * 0.1,
                targetY: stage.height * 0.1,
                travel: 1,
                endScale: 0.1,
                overshootPx: 0,
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
            maxHeight: 90, // optional: auto fit height
        });
    }

    public moveToGlobal(child: any, targetContainer: Container): void {
        const globalPos = child.getGlobalPosition(new Point());

        child.parent?.removeChild(child);

        const localPos = targetContainer.toLocal(globalPos);

        child.position.copyFrom(localPos);
        targetContainer.addChild(child);
    }

    private normalize(x: number, y: number) {
        const len = Math.hypot(x, y) || 1;
        return { x: x / len, y: y / len, len };
    }

    private async flyTextToTarget(
        txt: Container,
        {
            delay = 0,
            targetX,
            targetY,
            minArc = 40,
            maxArc = 140,
            overshootPx = 26,
            travel = 0.85,
            startScale,
            endScale = 0.55,
        }: FlyToOptions,
    ): Promise<void> {

        gsap.killTweensOf(txt);

        // safety against flicker
        txt.alpha = Math.max(txt.alpha ?? 1, 0.001);

        const sx = txt.x;
        const sy = txt.y;
        const dx = targetX - sx;
        const dy = targetY - sy;

        const n = this.normalize(dx, dy);
        const dir = { x: n.x, y: n.y };
        const dist = n.len;

        // perpendicular vector
        const perp = { x: -dir.y, y: dir.x };

        // distance-based curvature (prevents wild bends)
        const arcBase = gsap.utils.clamp(minArc, maxArc, dist * 0.22);
        const side =
            (Math.random() < 0.5 ? -1 : 1) *
            gsap.utils.random(0.65, 1.15);

        const c1 = {
            x: sx + dx * 0.18 + perp.x * arcBase * side,
            y: sy + dy * 0.18 + perp.y * arcBase * side,
        };

        const c2 = {
            x: sx + dx * 0.72 + perp.x * arcBase * 0.35 * side,
            y: sy + dy * 0.72 + perp.y * arcBase * 0.35 * side,
        };

        const overshoot = {
            x: targetX + dir.x * overshootPx,
            y: targetY + dir.y * overshootPx,
        };

        const path = [
            { x: sx, y: sy },
            c1,
            c2,
            overshoot,
        ];

        const start = startScale ?? txt.scale.x;

        const tl = gsap.timeline({ delay });

        // small alpha guard (prevents blink)
        tl.to(txt, { alpha: 1, duration: 0.08, overwrite: true }, 0);

        // PHASE 1 — orbital capture
        tl.to(txt, {
            duration: travel,
            ease: "power4.in",
            motionPath: {
                path,
                type: "cubic",
                autoRotate: false,
                curviness: 2,
            },
            x: overshoot.x,
            y: overshoot.y,
            overwrite: true,
        }, 0);

        await tl.then();
    }

}
