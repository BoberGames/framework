import { Container, Sprite, Texture, Ticker } from "pixi.js";

type Align = "left" | "center" | "right";

export interface SpriteNumberTextOptions {
    digitTextures: Record<string, Texture>;
    text?: string | number;
    spacing?: number;
    scale?: number;
    align?: Align;
    glyphTint?: number;
    maxHeight?: number;
}

type ShuffleOptions = {
    /** total duration in ms */
    duration?: number;           // default 450
    /** how many random swaps per second per glyph */
    speed?: number;              // default 60
    /** optional stagger per glyph in ms (left->right) */
    staggerMs?: number;          // default 10
    /** allowed characters to shuffle through (defaults to keys of digitTextures) */
    charset?: string[];          // default Object.keys(digitTextures)
    /** if true, keep glyph count fixed while shuffling (pads/trim) */
    keepLength?: boolean;        // default true
};

export class SpriteNumberText extends Container {
    private glyphs: Sprite[] = [];

    private _text = "";
    private _spacing = 0;
    private _glyphScale = 1;
    private _align: Align = "left";
    private _glyphTint?: number;
    private _maxHeight?: number;

    // --- shuffle state ---
    private _shuffleTickerFn?: (dt: number) => void;
    private _shuffleRunning = false;
    private _shuffleResolve?: () => void;
    private _spacingPercent: number = 0;

    constructor(private opts: SpriteNumberTextOptions) {
        super();

        this._spacing = opts.spacing ?? 0;
        this._glyphScale = opts.scale ?? 1;
        this._align = opts.align ?? "left";
        this._glyphTint = opts.glyphTint;
        this._maxHeight = opts.maxHeight;

        this.text = opts.text ?? "";
    }

    public set text(v: string | number) {
        this._text = String(v);
        this.rebuild();
    }
    public get text() { return this._text; }

    public set spacing(v: number) {
        this._spacing = v;
        this.layout(false);
    }
    public get spacing() { return this._spacing; }

    public set scaleValue(v: number) {
        this._glyphScale = v;
        this.layout(true);
    }
    public get scaleValue() { return this._glyphScale; }

    public set align(v: Align) {
        this._align = v;
        this.layout(false);
    }
    public get align() { return this._align; }

    public set glyphTint(v: number | undefined) {
        this._glyphTint = v;
        this.applyGlyphTint();
    }
    public get glyphTint() { return this._glyphTint; }

    public set maxHeight(v: number | undefined) {
        this._maxHeight = v;
        this.layout(true);
    }
    public get maxHeight() { return this._maxHeight; }

    private rebuild(): void {
        for (const s of this.glyphs) s.destroy();
        this.glyphs.length = 0;

        const map = this.opts.digitTextures;

        for (const ch of this._text) {
            const tex = map[ch];
            if (!tex) continue;

            const spr = new Sprite(tex);
            spr.anchor.set(0, 0);
            this.glyphs.push(spr);
            this.addChild(spr);
        }

        this.applyGlyphTint();
        this.layout(true);
    }

    private applyGlyphTint(): void {
        if (this._glyphTint == null) return;
        for (const g of this.glyphs) g.tint = this._glyphTint;
    }

    private layout(recomputeScale: boolean): void {
        if (this.glyphs.length === 0) return;

        // --- 1) remember current anchor point in PARENT coords (so we can restore it)
        const oldBounds = this.getLocalBounds();
        const oldAnchorX = this.getAnchorLocalX(oldBounds);
        const parent = this.parent;
        const oldAnchorInParent = parent
            ? parent.toLocal(this.toGlobal({ x: oldAnchorX, y: 0 }))
            : null;

        // --- 2) do your normal layout
        let s = this._glyphScale;

        if (recomputeScale && this._maxHeight != null) {
            const h = Math.max(...this.glyphs.map(g => g.texture.height));
            if (h > 0) s = (this._maxHeight / h) * this._glyphScale;
        }

        const factor = 1 + (this._spacingPercent / 100);

        let x = 0;
        for (const g of this.glyphs) {
            g.scale.set(s);
            g.position.set(x, 0);

            const adv = Math.max(0, g.width * factor);
            x += adv + this._spacing;
        }

        const totalW = x - this._spacing;
        const offset =
            this._align === "center" ? -totalW / 2 :
                this._align === "right" ? -totalW :
                    0;

        if (offset !== 0) {
            for (const g of this.glyphs) g.x += offset;
        }

        // --- 3) restore anchor point to the same PARENT position
        if (parent && oldAnchorInParent) {
            const newBounds = this.getLocalBounds();
            const newAnchorX = this.getAnchorLocalX(newBounds);

            const newAnchorInParent = parent.toLocal(this.toGlobal({ x: newAnchorX, y: 0 }));
            const dx = oldAnchorInParent.x - newAnchorInParent.x;

            // shift the container so the anchor stays visually locked
            this.x += dx;
        }
    }



    // =================================================================================
    // Shuffle / bang-up animation
    // =================================================================================

    /** Stop shuffle immediately (optionally snap to current `this.text`) */
    public stopShuffle(): void {
        if (!this._shuffleRunning) return;

        this._shuffleRunning = false;
        if (this._shuffleTickerFn) { // @ts-ignore
            Ticker.shared.remove(this._shuffleTickerFn);
        }
        this._shuffleTickerFn = undefined;

        const r = this._shuffleResolve;
        this._shuffleResolve = undefined;
        r?.();
    }

    /**
     * Fast random rolling of digits, then snaps to `finalText`.
     * Returns a promise that resolves when finished.
     */
    public shuffleTo(finalText: string | number, options: ShuffleOptions = {}): Promise<void> {
        const duration = options.duration ?? 450;
        const speed = options.speed ?? 60;         // swaps/sec
        const staggerMs = options.staggerMs ?? 10;
        const keepLength = options.keepLength ?? true;

        const map = this.opts.digitTextures;
        const charset = (options.charset?.length ? options.charset : Object.keys(map))
            .filter(ch => map[ch]); // ensure valid
        if (charset.length === 0) {
            // nothing to shuffle with; just set final
            this.text = finalText;
            return Promise.resolve();
        }

        // Ensure we have glyphs to animate now
        // If current text is empty, create placeholders with random glyphs
        if (this.glyphs.length === 0) {
            const fallbackLen = String(finalText).length || 1;
            this._text = "0".repeat(fallbackLen);
            this.rebuild();
        }

        // Optionally keep current glyph count fixed while shuffling
        const finalStr = String(finalText);
        const targetLen = keepLength ? this.glyphs.length : finalStr.length;

        // If lengths differ and keepLength=false, rebuild to match final length (so shuffle uses correct glyph count)
        if (!keepLength && this.glyphs.length !== finalStr.length) {
            this._text = finalStr;
            this.rebuild();
        }

        // If keepLength=true but final has different length, we’ll pad/trim for the final snap.
        const paddedFinal = keepLength
            ? this.fitLength(finalStr, targetLen)
            : finalStr;

        // Cancel any prior shuffle
        this.stopShuffle();

        this._shuffleRunning = true;

        return new Promise<void>((resolve) => {
            this._shuffleResolve = resolve;

            const startMs = performance.now();
            const swapIntervalMs = 1000 / speed;

            // per-glyph timers (so we can stagger + keep ultra-fast updates without rebuilding)
            const nextSwapAt = new Array(this.glyphs.length).fill(0);
            const offsets = this.glyphs.map((_, i) => i * staggerMs);

            const tickerFn = (dt: number) => {
                // dt is frames delta; we use performance.now for stable ms timing
                const now = performance.now();
                const elapsed = now - startMs;

                const done = elapsed >= duration + (this.glyphs.length - 1) * staggerMs;

                for (let i = 0; i < this.glyphs.length; i++) {
                    const localElapsed = elapsed - offsets[i];
                    if (localElapsed < 0) continue;

                    if (done) continue;

                    if (localElapsed >= nextSwapAt[i]) {
                        nextSwapAt[i] += swapIntervalMs;

                        const ch = charset[(Math.random() * charset.length) | 0];
                        const tex = map[ch];
                        const g = this.glyphs[i];

                        // Change texture only (no rebuild) -> very fast
                        g.texture = tex;

                        // keep tint consistent (texture swap preserves tint, but safe if glyphTint changes mid-spin)
                        if (this._glyphTint != null) g.tint = this._glyphTint;
                    }
                }

                if (done) {
                    // Stop ticker, snap to final
                    this.stopShuffle();

                    // Snap to final (rebuild real glyphs)
                    this.text = paddedFinal;
                }
            };

            this._shuffleTickerFn = tickerFn;
            // @ts-ignore
            Ticker.shared.add(tickerFn);
        });
    }

    /** Pad/trim a string to exact length (left aligned by default) */
    private fitLength(str: string, len: number): string {
        if (str.length === len) return str;
        if (str.length > len) return str.slice(str.length - len); // trim left (keeps least significant digits)
        // pad left with zeros (common for counters)
        return str.padStart(len, "0");
    }

    /** 0 = no change, -5 = 5% closer, +5 = 5% further */
    public set spacingPercent(v: number) {
        this._spacingPercent = v;
        this.layout(false);
    }
    public get spacingPercent() {
        return this._spacingPercent;
    }

    private getAnchorLocalX(bounds: { x: number; width: number }): number {
        // choose which point we want to "lock" in place
        // you can lock to align, or just always center if you prefer
        if (this._align === "center") return bounds.x + bounds.width / 2;
        if (this._align === "right") return bounds.x + bounds.width;
        return bounds.x; // left
    }
}
