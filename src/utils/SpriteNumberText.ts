import { Container, Sprite, Texture, Ticker } from "pixi.js";
import gsap from "gsap";

type Align = "left" | "center" | "right";

export interface SpriteNumberTextOptions {
    digitTextures: Record<string, Texture>;
    text?: string | number;
    spacing?: number;      // px between glyphs
    scale?: number;        // glyph scale multiplier (NOT Container.scale)
    align?: Align;         // how the number anchors to (0,0)
    glyphTint?: number;
    maxHeight?: number;    // auto-scale glyphs to fit this height (optional)
}

type BlinkOptions = {
    everyMs?: number;          // pause between blink bursts (default 2500)
    flashMs?: number;          // duration of each flash up/down (default 70)
    flashTint?: number;        // flash color (default 0xffffff)
    baseTint?: number;         // fallback base tint if glyphTint undefined (default 0xffffff)
    scaleUp?: number;          // max scale multiplier relative to current scale (default 1.08)
    scaleMs?: number;          // scale up/down speed per flash (default 90)
};

type CountOptions = {
    pulse?: boolean;           // default true
    pulseScale?: number;       // default 1.12
    pulseMs?: number;          // default 140 (full cycle)
    ease?: string;             // default "none"
    maxStepPerUpdate?: number; // default 50000

    showDecimals?: boolean;   // 👈 NEW
    decimals?: number;        // 👈 optional, default = 2
};

export class SpriteNumberText extends Container {
    private glyphs: Sprite[] = [];
    private glyphLayer = new Container();

    private _text = "";
    private _spacing = 0;
    private _glyphScale = 1;
    private _align: Align = "left";
    private _glyphTint?: number;
    private _maxHeight?: number;
    private _spacingPercent = 0;

    // animations
    private _countTween?: gsap.core.Tween;
    private _pulseTween?: gsap.core.Tween;

    // (kept from your original for compatibility)
    private _shuffleTickerFn?: (dt: number) => void;
    private _shuffleRunning = false;
    private _shuffleResolve?: () => void;
    private _pulseBaseScale?: { x: number; y: number };
    private _blinkTl?: gsap.core.Timeline;
    private _blinkBaseScale?: { x: number; y: number };

    constructor(private opts: SpriteNumberTextOptions) {
        super();
        this.addChild(this.glyphLayer);

        this._spacing = opts.spacing ?? 0;
        this._glyphScale = opts.scale ?? 1;
        this._align = opts.align ?? "left";
        this._glyphTint = opts.glyphTint;
        this._maxHeight = opts.maxHeight;

        this.text = opts.text ?? "";
    }

    // -----------------------------
    // Public API
    // -----------------------------

    public set text(v: string | number) {
        this._text = String(v);
        this.rebuild();
    }
    public get text() {
        return this._text;
    }

    public set spacing(v: number) {
        this._spacing = v;
        this.layout();
    }
    public get spacing() {
        return this._spacing;
    }

    /** glyph scale multiplier (NOT Container.scale) */
    public set scaleValue(v: number) {
        this._glyphScale = v;
        this.layout();
    }
    public get scaleValue() {
        return this._glyphScale;
    }

    public set align(v: Align) {
        this._align = v;
        this.layout();
    }
    public get align() {
        return this._align;
    }

    public set glyphTint(v: number | undefined) {
        this._glyphTint = v;
        this.applyGlyphTint();
    }
    public get glyphTint() {
        return this._glyphTint;
    }

    public set maxHeight(v: number | undefined) {
        this._maxHeight = v;
        this.layout();
    }
    public get maxHeight() {
        return this._maxHeight;
    }

    /** 0 = no change, -5 = 5% closer, +5 = 5% further */
    public set spacingPercent(v: number) {
        this._spacingPercent = v;
        this.layout();
    }
    public get spacingPercent() {
        return this._spacingPercent;
    }

    // -----------------------------
    // Counting
    // -----------------------------

    public stopCount(): void {
        this._countTween?.kill();
        this._countTween = undefined;
        this.stopPulseLoop(true);
    }

    /**
     * Counts 0 -> amount over durationMs.
     * Uses GSAP tween timing (reliable), updates text on each tick.
     */
    public countTo(amount: number, durationMs: number, options?: CountOptions): Promise<void> {
        this.stopCount();

        const showDecimals = options?.showDecimals ?? false;
        const decimals = showDecimals ? (options?.decimals ?? 2) : 0;
        const pow = Math.pow(10, decimals);

        const targetUnits = Math.max(0, Math.round(Number(amount) * pow));
        const durS = Math.max(0, durationMs) / 1000;

        this.align = "center";

        const format = (units: number) => {
            const v = units / pow;
            return decimals > 0 ? v.toFixed(decimals) : String(Math.floor(v));
        };

        this.text = format(0);

        if (targetUnits === 0 || durS <= 0) {
            this.text = format(targetUnits);
            return Promise.resolve();
        }

        const pulse = options?.pulse ?? true;
        const pulseScale = options?.pulseScale ?? 1.12;
        const pulseMs = options?.pulseMs ?? 140;
        if (pulse) this.startPulseLoop(pulseScale, pulseMs);

        // --------- Feel knobs (auto-balanced)
        // target visible updates/sec (casino counters usually 30–60)
        const updatesPerSec = 45;
        const minTicks = 30;            // don't feel "teleporty"
        const maxTicks = 220;           // don't spam updates on long durations
        const totalTicks = Math.max(minTicks, Math.min(maxTicks, Math.round(durS * updatesPerSec)));

        // Money units: nice step ladders (expressed in "units")
        // If decimals=2, 1 unit = 0.01
        const niceSteps = decimals === 2
            ? [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
            : [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

        const snapToNice = (raw: number) => {
            // pick closest "nice" step (not just <=) to keep pacing stable
            let best = niceSteps[0];
            let bestDiff = Math.abs(raw - best);
            for (const s of niceSteps) {
                const d = Math.abs(raw - s);
                if (d < bestDiff) {
                    bestDiff = d;
                    best = s;
                }
            }
            return Math.max(1, best);
        };

        // casino-ish time shaping: fast early, slow finish
        const easeFn = (p: number) => {
            // easeOutCubic
            const inv = 1 - p;
            return 1 - inv * inv * inv;
        };

        // Drive a discrete ticker rather than per-frame "catch up"
        const state = { tick: 0 };
        let shown = 0;

        return new Promise<void>((resolve) => {
            this._countTween = gsap.to(state, {
                tick: totalTicks,
                duration: durS,
                ease: "none",
                onUpdate: () => {
                    // integer tick index
                    const k = Math.min(totalTicks, Math.max(0, Math.floor(state.tick)));
                    const p = k / totalTicks;

                    // where we want to be by this tick (continuous target)
                    const desired = Math.floor(easeFn(p) * targetUnits);

                    // remaining distance / ticks
                    const remaining = targetUnits - shown;
                    const remainingTicks = Math.max(1, totalTicks - k);

                    if (remaining <= 0) return;

                    // Endgame: ALWAYS land with 1-unit granularity for the last part
                    // (last 0.50 for cents, or last 50 units for integers feels good)
                    const endgameUnits = decimals === 2 ? 50 : 50; // 0.50 or 50
                    let step: number;

                    if (remaining <= endgameUnits) {
                        step = 1; // show the satisfying "final ticks"
                    } else {
                        // Ideal step to arrive smoothly
                        const ideal = Math.ceil(remaining / remainingTicks);

                        // But also don't lag behind desired: ensure we progress at least 1 toward desired
                        const minToTrackDesired = Math.max(1, desired - shown);

                        // Snap ideal to nice steps, but keep it tracking desired
                        step = Math.max(minToTrackDesired, snapToNice(ideal));
                    }

                    shown = Math.min(targetUnits, shown + step);
                    this.text = format(shown);
                },
                onComplete: () => {
                    this.text = format(targetUnits);
                    this.stopPulseLoop(true);
                    this._countTween = undefined;
                    resolve();
                },
                onInterrupt: () => {
                    this.stopPulseLoop(true);
                    this._countTween = undefined;
                    resolve();
                },
            });
        });
    }



    // -----------------------------
    // Old API compatibility (shuffle)
    // -----------------------------

    public stopShuffle(): void {
        if (!this._shuffleRunning) return;

        this._shuffleRunning = false;
        if (this._shuffleTickerFn) {
            // @ts-ignore
            Ticker.shared.remove(this._shuffleTickerFn);
        }
        this._shuffleTickerFn = undefined;

        const r = this._shuffleResolve;
        this._shuffleResolve = undefined;
        r?.();
    }

    // -----------------------------
    // Internal: build + layout
    // -----------------------------
    private glyphMetrics(tex: Texture) {
        // Pixi: tex.orig = original untrimmed size
        //       tex.trim = rectangle of the trimmed frame inside orig (if trimmed)
        // @ts-ignore
        const orig = tex.orig;
        // @ts-ignore
        const trim = tex.trim;

        const w = (trim?.width ?? orig?.width ?? tex.width) as number;
        const h = (trim?.height ?? orig?.height ?? tex.height) as number;

        const ox = (trim?.x ?? 0) as number; // left inset removed by trimming
        const oy = (trim?.y ?? 0) as number; // top inset removed by trimming

        return { w, h, ox, oy };
    }

    private rebuild(): void {
        // destroy old glyphs
        for (const s of this.glyphs) s.destroy();
        this.glyphs.length = 0;
        this.glyphLayer.removeChildren();

        const map = this.opts.digitTextures;

        for (const ch of this._text) {
            const tex = map[ch];
            if (!tex) continue;

            const spr = new Sprite(tex);
            spr.anchor.set(0, 0);
            this.glyphs.push(spr);
            this.glyphLayer.addChild(spr);
        }

        this.applyGlyphTint();
        this.layout();
    }

    private applyGlyphTint(): void {
        const tint = this._glyphTint ?? 0xffffff;
        for (const g of this.glyphs) g.tint = tint;
    }

    /** Prefer texture.orig width/height so trimming doesn't break spacing */
    private texW(tex: Texture): number {
        // @ts-ignore
        return (tex.orig?.width ?? tex.width) as number;
    }
    private texH(tex: Texture): number {
        // @ts-ignore
        return (tex.orig?.height ?? tex.height) as number;
    }

    private layout(): void {
        if (this.glyphs.length === 0) {
            this.glyphLayer.pivot.set(0, 0);
            this.glyphLayer.position.set(0, 0);
            return;
        }

        // compute effective glyph scale (maxHeight optional)
        let s = this._glyphScale;
        if (this._maxHeight != null) {
            let maxH = 0;
            for (const g of this.glyphs) {
                const m = this.glyphMetrics(g.texture);
                maxH = Math.max(maxH, m.h);
            }
            if (maxH > 0) s = (this._maxHeight / maxH) * this._glyphScale;
        }

        const factor = 1 + this._spacingPercent / 100;

        // -------- PASS 1: compute a common baseline (max visible bottom)
        let baseline = 0;
        for (const g of this.glyphs) {
            const m = this.glyphMetrics(g.texture);
            const offsetY = -m.oy * s;           // your trim compensation
            const bottom = offsetY + m.h * s;    // visible bottom for this glyph
            baseline = Math.max(baseline, bottom);
        }

        // -------- PASS 2: place glyphs with bottoms aligned
        let x = 0;
        for (const g of this.glyphs) {
            g.scale.set(s);

            const m = this.glyphMetrics(g.texture);

            // keep X trim compensation (optional, but recommended)
            const offsetX = -m.ox * s;

            // ✅ hard-lock Y so nothing can shift vertically
            g.position.set(x + offsetX, 0);

            const adv = m.w * s * factor;
            x += adv + this._spacing;
        }

        const totalW = x - this._spacing;

        const pivotX =
            this._align === "center" ? totalW / 2 :
                this._align === "right"  ? totalW :
                    0;

        this.glyphLayer.pivot.set(pivotX, 0);
        this.glyphLayer.position.set(0, 0);
    }



    // -----------------------------
    // Pulse loop
    // -----------------------------

    private startPulseLoop(scaleUp: number, cycleMs: number): void {
        // kill existing pulse but do NOT change base if already running
        if (!this._pulseTween) {
            this._pulseBaseScale = { x: this.scale.x, y: this.scale.y };
        }

        this._pulseTween?.kill();
        this._pulseTween = undefined;

        const base = this._pulseBaseScale ?? { x: this.scale.x, y: this.scale.y };
        const half = Math.max(0.01, (cycleMs / 1000) / 2);

        // important: force scale to base before starting, so there is never drift
        this.scale.set(base.x, base.y);

        this._pulseTween = gsap.to(this.scale, {
            x: base.x * scaleUp,
            y: base.y * scaleUp,
            duration: half,
            yoyo: true,
            repeat: -1,
        });
    }

    private stopPulseLoop(resetToBase: boolean): void {
        if (!this._pulseTween) return;

        this._pulseTween.kill();
        this._pulseTween = undefined;

        if (resetToBase && this._pulseBaseScale) {
            this.scale.set(this._pulseBaseScale.x, this._pulseBaseScale.y);
        }

        this._pulseBaseScale = undefined;
    }

    public startBlinkingEffect(opts?: BlinkOptions): void {
        this.stopBlinkingEffect(false);

        const everyMs   = opts?.everyMs ?? 2500;   // time between bursts
        const flashMs   = opts?.flashMs ?? 70;     // up OR down time
        const betweenMs = 90;                      // small pause between the 2 flashes (tweakable)
        const flashTint = opts?.flashTint ?? 0xffffff;
        const baseTint  = opts?.baseTint ?? (this._glyphTint ?? 0xffffff);

        const scaleUp = opts?.scaleUp ?? 1.08;
        const scaleMs = opts?.scaleMs ?? 90;

        // capture base scale once (prevents drift)
        this._blinkBaseScale = { x: this.scale.x, y: this.scale.y };
        const base = this._blinkBaseScale;

        // proxy for tint tween (no PixiPlugin needed)
        const c = { t: 0 };

        const applyTint = () => {
            const tint = this.lerpColor(baseTint, flashTint, c.t);
            this.setGlyphTintAll(tint);
        };

        const flashS = flashMs / 1000;
        const scaleS = scaleMs / 1000;
        const betweenS = betweenMs / 1000;

        const oneFlash = () => {
            // ensure starting state for each flash
            this._blinkTl!.set(c, { t: 0 }, ">");
            this._blinkTl!.call(() => this.setGlyphTintAll(baseTint), [], ">");

            // UP (tint + scale)
            this._blinkTl!.to(c, { t: 1, duration: flashS, ease: "power1.out", onUpdate: applyTint }, ">");
            this._blinkTl!.to(this.scale, {
                x: base.x * scaleUp,
                y: base.y * scaleUp,
                duration: scaleS,
                ease: "power2.out",
            }, "<");

            // DOWN (tint + scale)
            this._blinkTl!.to(c, { t: 0, duration: flashS, ease: "power1.in", onUpdate: applyTint }, ">");
            this._blinkTl!.to(this.scale, {
                x: base.x,
                y: base.y,
                duration: scaleS,
                ease: "power2.in",
            }, "<");

            // lock back to base tint (sometimes easing leaves tiny rounding)
            this._blinkTl!.call(() => this.setGlyphTintAll(baseTint), [], ">");
        };

        this._blinkTl = gsap.timeline({ repeat: -1 });

        // Two flashes, with a small gap between them (so they read as “double blink”)
        oneFlash();
        this._blinkTl.to({}, { duration: betweenS });
        oneFlash();

        // Wait until next burst (ensure it's never negative)
        const burstMs = (flashMs * 2) + (scaleMs * 2) + betweenMs; // rough but safe
        const waitMs = Math.max(0, everyMs - burstMs);
        this._blinkTl.to({}, { duration: waitMs / 1000 });

        // Safety reset if killed mid-animation
        this._blinkTl.eventCallback("onInterrupt", () => {
            this.setGlyphTintAll(baseTint);
            this.scale.set(base.x, base.y);
        });
    }


    public stopBlinkingEffect(reset: boolean = true): void {
        if (!this._blinkTl) return;

        this._blinkTl.kill();
        this._blinkTl = undefined;

        if (reset) {
            const baseTint = this._glyphTint ?? 0xffffff;
            this.setGlyphTintAll(baseTint);

            if (this._blinkBaseScale) {
                this.scale.set(this._blinkBaseScale.x, this._blinkBaseScale.y);
            }
        }

        this._blinkBaseScale = undefined;
    }



    private formatValue(
        value: number,
        showDecimals: boolean,
        decimals: number,
    ): string {
        if (!showDecimals) {
            return Math.floor(value).toString();
        }

        return value.toFixed(decimals);
    }

    private lerpColor(a: number, b: number, t: number): number {
        const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;

        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);

        return (rr << 16) | (rg << 8) | rb;
    }

    private setGlyphTintAll(tint: number): void {
        for (const g of this.glyphs) g.tint = tint;
    }

}
