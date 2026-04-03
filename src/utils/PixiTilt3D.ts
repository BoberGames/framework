import {
    Application,
    Container,
    FederatedPointerEvent,
    PerspectiveMesh,
    Rectangle,
    Texture,
    Ticker,
} from "pixi.js";

export interface PixiPerspectiveTiltOptions {
    width: number;
    height: number;

    maxTiltDeg?: number;
    perspectiveOffset?: number;
    scaleOnHover?: number;
    smoothing?: number;
    globalTracking?: boolean;
    resetOnLeave?: boolean;
    autoUpdate?: boolean;

    /**
     * More vertices = smoother perspective, a bit heavier.
     * 12-20 is a good range for a full-screen board/card.
     */
    verticesX?: number;
    verticesY?: number;

    /**
     * If true, recaptures the source texture every update.
     * Keep true for animated boards like your cascade.
     */
    liveTexture?: boolean;

    /**
     * Resolution used when generating the texture.
     * Defaults to renderer resolution.
     */
    textureResolution?: number;
}

export class PixiTilt3D extends Container {
    public readonly source: Container;

    private readonly app: Application;
    private readonly options: Required<PixiPerspectiveTiltOptions>;
    private readonly mesh: PerspectiveMesh;

    private currentNX = 0;
    private currentNY = 0;
    private targetNX = 0;
    private targetNY = 0;

    private currentScale = 1;
    private targetScale = 1;

    private lastGeneratedTexture: Texture | null = null;

    constructor(app: Application, options: PixiPerspectiveTiltOptions) {
        super();

        this.app = app;

        this.options = {
            width: options.width,
            height: options.height,
            maxTiltDeg: options.maxTiltDeg ?? 10,
            perspectiveOffset: options.perspectiveOffset ?? 45,
            scaleOnHover: options.scaleOnHover ?? 1,
            smoothing: options.smoothing ?? 0.14,
            globalTracking: options.globalTracking ?? false,
            resetOnLeave: options.resetOnLeave ?? true,
            autoUpdate: options.autoUpdate ?? true,
            verticesX: options.verticesX ?? 16,
            verticesY: options.verticesY ?? 16,
            liveTexture: options.liveTexture ?? true,
            textureResolution: options.textureResolution ?? app.renderer.resolution
        };

        this.eventMode = "static";
        this.hitArea = new Rectangle(0, 0, this.options.width, this.options.height);

        this.source = new Container();

        this.mesh = new PerspectiveMesh({
            texture: Texture.EMPTY,
            verticesX: this.options.verticesX,
            verticesY: this.options.verticesY,
            x0: 0,
            y0: 0,
            x1: this.options.width,
            y1: 0,
            x2: this.options.width,
            y2: this.options.height,
            x3: 0,
            y3: this.options.height
        });

        this.addChild(this.mesh);

        this.on("pointerenter", this.onPointerEnter, this);
        this.on("pointermove", this.onPointerMove, this);
        this.on("pointerleave", this.onPointerLeave, this);

        if (this.options.globalTracking) {
            this.on("globalpointermove", this.onGlobalPointerMove, this);
        }

        this.captureSourceToTexture();
        this.applyMeshFromCurrentState();

        if (this.options.autoUpdate) {
            Ticker.shared.add(this.update, this);
        }
    }

    public addSourceChild<T extends Container>(child: T): T {
        this.source.addChild(child);
        return child;
    }

    public markTextureDirty(): void {
        this.captureSourceToTexture();
    }

    public resize(width: number, height: number): void {
        this.options.width = width;
        this.options.height = height;

        this.hitArea = new Rectangle(0, 0, width, height);

        this.mesh.setCorners(
            0, 0,
            width, 0,
            width, height,
            0, height
        );

        this.captureSourceToTexture();
    }

    public resetTilt(immediate = false): void {
        this.targetNX = 0;
        this.targetNY = 0;
        this.targetScale = 1;

        if (!immediate) return;

        this.currentNX = 0;
        this.currentNY = 0;
        this.currentScale = 1;
        this.applyMeshFromCurrentState();
    }

    public update(): void {
        const lerp = this.options.smoothing;

        this.currentNX += (this.targetNX - this.currentNX) * lerp;
        this.currentNY += (this.targetNY - this.currentNY) * lerp;
        this.currentScale += (this.targetScale - this.currentScale) * lerp;

        if (this.options.liveTexture) {
            this.captureSourceToTexture();
        }

        this.applyMeshFromCurrentState();
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        if (this.options.autoUpdate) {
            Ticker.shared.remove(this.update, this);
        }

        this.off("pointerenter", this.onPointerEnter, this);
        this.off("pointermove", this.onPointerMove, this);
        this.off("pointerleave", this.onPointerLeave, this);
        this.off("globalpointermove", this.onGlobalPointerMove, this);

        if (this.lastGeneratedTexture) {
            this.lastGeneratedTexture.destroy(true);
            this.lastGeneratedTexture = null;
        }

        super.destroy(options);
    }

    private onPointerEnter(): void {
        this.targetScale = this.options.scaleOnHover;
    }

    private onPointerMove(e: FederatedPointerEvent): void {
        if (this.options.globalTracking) return;

        const local = e.getLocalPosition(this);
        this.updatePointer(local.x, local.y);
    }

    private onGlobalPointerMove(e: FederatedPointerEvent): void {
        if (!this.options.globalTracking) return;

        const local = this.toLocal(e.global);
        this.updatePointer(local.x, local.y);
    }

    private onPointerLeave(): void {
        if (this.options.resetOnLeave) {
            this.targetNX = 0;
            this.targetNY = 0;
            this.targetScale = 1;
        }
    }

    private updatePointer(localX: number, localY: number): void {
        const cx = this.options.width * 0.5;
        const cy = this.options.height * 0.5;

        const nx = (localX - cx) / (this.options.width * 0.5);
        const ny = (localY - cy) / (this.options.height * 0.5);

        this.targetNX = this.clamp(nx, -1, 1);
        this.targetNY = this.clamp(ny, -1, 1);
    }

    private applyMeshFromCurrentState(): void {
        const w = this.options.width;
        const h = this.options.height;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const halfW = w * 0.5;
        const halfH = h * 0.5;

        // Mouse down  -> top edge comes toward viewer
        const pitch = this.degToRad(-this.currentNY * this.options.maxTiltDeg);

        // Mouse right -> right edge comes toward viewer
        const yaw = this.degToRad(-this.currentNX * this.options.maxTiltDeg);

        // Smaller distance = stronger perspective
        // Bigger distance = flatter / calmer card
        //TODO: change this for effect
        const cameraDistance =
            Math.max(w, h) * 0.8 + this.options.perspectiveOffset * 12;

        const p0 = this.projectCardPoint(-halfW, -halfH, pitch, yaw, cameraDistance); // top-left
        const p1 = this.projectCardPoint( halfW, -halfH, pitch, yaw, cameraDistance); // top-right
        const p2 = this.projectCardPoint( halfW,  halfH, pitch, yaw, cameraDistance); // bottom-right
        const p3 = this.projectCardPoint(-halfW,  halfH, pitch, yaw, cameraDistance); // bottom-left

        const scale = this.currentScale;

        this.mesh.setCorners(
            cx + p0.x * scale, cy + p0.y * scale,
            cx + p1.x * scale, cy + p1.y * scale,
            cx + p2.x * scale, cy + p2.y * scale,
            cx + p3.x * scale, cy + p3.y * scale
        );
    }

    private projectCardPoint(
        x: number,
        y: number,
        pitch: number,
        yaw: number,
        cameraDistance: number
    ): { x: number; y: number } {
        // Rotate around Y first (left/right tilt)
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);

        const xYaw = x * cosY;
        const zYaw = -x * sinY;

        // Then rotate around X (up/down tilt)
        const cosX = Math.cos(pitch);
        const sinX = Math.sin(pitch);

        const yPitch = y * cosX - zYaw * sinX;
        const zPitch = y * sinX + zYaw * cosX;

        const denom = Math.max(0.001, cameraDistance - zPitch);
        const perspective = cameraDistance / denom;

        return {
            x: xYaw * perspective,
            y: yPitch * perspective
        };
    }

    private degToRad(deg: number): number {
        return (deg * Math.PI) / 180;
    }

    private captureSourceToTexture(): void {
        const newTexture = this.app.renderer.generateTexture({
            target: this.source,
            frame: new Rectangle(0, 0, this.options.width, this.options.height),
            resolution: this.options.textureResolution
        });

        this.mesh.texture = newTexture;

        if (this.lastGeneratedTexture && this.lastGeneratedTexture !== Texture.EMPTY) {
            this.lastGeneratedTexture.destroy(true);
        }

        this.lastGeneratedTexture = newTexture;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}