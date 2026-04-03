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

    /**
     * Mobile gyroscope / device orientation support
     */
    useDeviceOrientation?: boolean;
    deviceMaxAngleDeg?: number;
    invertDeviceX?: boolean;
    invertDeviceY?: boolean;
    deviceDeadZone?: number;
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

    private deviceOrientationEnabled = false;
    private waitingForDeviceCalibration = false;
    private baseBeta: number | null = null;
    private baseGamma: number | null = null;

    private readonly onDeviceOrientationBound: (event: DeviceOrientationEvent) => void;

    constructor(app: Application, options: PixiPerspectiveTiltOptions) {
        super();

        this.app = app;
        this.onDeviceOrientationBound = this.onDeviceOrientation.bind(this);

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
            textureResolution: options.textureResolution ?? app.renderer.resolution,

            useDeviceOrientation: options.useDeviceOrientation ?? false,
            deviceMaxAngleDeg: options.deviceMaxAngleDeg ?? 28,
            invertDeviceX: options.invertDeviceX ?? false,
            invertDeviceY: options.invertDeviceY ?? false,
            deviceDeadZone: options.deviceDeadZone ?? 0.04
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

    public async enableDeviceOrientation(): Promise<boolean> {
        if (!this.options.useDeviceOrientation) {
            return false;
        }

        if (typeof window === "undefined") {
            return false;
        }

        if (!window.isSecureContext) {
            return false;
        }

        if (!("DeviceOrientationEvent" in window)) {
            return false;
        }

        type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
            requestPermission?: () => Promise<"granted" | "denied">;
        };

        const DeviceOrientationCtor =
            window.DeviceOrientationEvent as DeviceOrientationEventWithPermission;

        if (typeof DeviceOrientationCtor.requestPermission === "function") {
            const result = await DeviceOrientationCtor.requestPermission();
            if (result !== "granted") {
                return false;
            }
        }

        this.disableDeviceOrientation();

        window.addEventListener("deviceorientation", this.onDeviceOrientationBound, { passive: true });
        this.deviceOrientationEnabled = true;
        this.calibrateDeviceOrientation();

        return true;
    }

    public disableDeviceOrientation(): void {
        if (typeof window !== "undefined") {
            window.removeEventListener("deviceorientation", this.onDeviceOrientationBound);
        }

        this.deviceOrientationEnabled = false;
        this.waitingForDeviceCalibration = false;
        this.baseBeta = null;
        this.baseGamma = null;
    }

    public calibrateDeviceOrientation(): void {
        this.waitingForDeviceCalibration = true;
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

        this.disableDeviceOrientation();

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
        if (this.deviceOrientationEnabled) return;
        if (this.options.globalTracking) return;

        const local = e.getLocalPosition(this);
        this.updatePointer(local.x, local.y);
    }

    private onGlobalPointerMove(e: FederatedPointerEvent): void {
        if (this.deviceOrientationEnabled) return;
        if (!this.options.globalTracking) return;

        const local = this.toLocal(e.global);
        this.updatePointer(local.x, local.y);
    }

    private onPointerLeave(): void {
        if (this.deviceOrientationEnabled) return;

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

    private onDeviceOrientation(event: DeviceOrientationEvent): void {
        if (!this.deviceOrientationEnabled) return;
        if (event.beta == null || event.gamma == null) return;

        const beta = event.beta;
        const gamma = event.gamma;

        if (this.waitingForDeviceCalibration || this.baseBeta == null || this.baseGamma == null) {
            this.baseBeta = beta;
            this.baseGamma = gamma;
            this.waitingForDeviceCalibration = false;
        }

        let relBeta = beta - this.baseBeta;
        let relGamma = gamma - this.baseGamma;

        const angle = this.getScreenAngle();

        let xDeg = 0;
        let yDeg = 0;

        switch (angle) {
            case 90:
                xDeg = relBeta;
                yDeg = -relGamma;
                break;

            case -90:
            case 270:
                xDeg = -relBeta;
                yDeg = relGamma;
                break;

            case 180:
            case -180:
                xDeg = -relGamma;
                yDeg = -relBeta;
                break;

            case 0:
            default:
                xDeg = relGamma;
                yDeg = relBeta;
                break;
        }

        let nx = this.clamp(xDeg / this.options.deviceMaxAngleDeg, -1, 1);
        let ny = this.clamp(yDeg / this.options.deviceMaxAngleDeg, -1, 1);

        if (this.options.invertDeviceX) nx *= -1;
        if (this.options.invertDeviceY) ny *= -1;

        if (Math.abs(nx) < this.options.deviceDeadZone) nx = 0;
        if (Math.abs(ny) < this.options.deviceDeadZone) ny = 0;

        this.targetNX = nx;
        this.targetNY = ny;
        this.targetScale = this.options.scaleOnHover;
    }

    private getScreenAngle(): number {
        const orientationApi = screen.orientation as ScreenOrientation | undefined;

        if (orientationApi && typeof orientationApi.angle === "number") {
            return orientationApi.angle;
        }

        const legacyOrientation = (window as Window & { orientation?: number }).orientation;
        return typeof legacyOrientation === "number" ? legacyOrientation : 0;
    }

    private applyMeshFromCurrentState(): void {
        const w = this.options.width;
        const h = this.options.height;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const halfW = w * 0.5;
        const halfH = h * 0.5;

        const pitch = this.degToRad(-this.currentNY * this.options.maxTiltDeg);
        const yaw = this.degToRad(-this.currentNX * this.options.maxTiltDeg);

        const cameraDistance =
            Math.max(w, h) * 0.8 + this.options.perspectiveOffset * 12;

        const p0 = this.projectCardPoint(-halfW, -halfH, pitch, yaw, cameraDistance);
        const p1 = this.projectCardPoint(halfW, -halfH, pitch, yaw, cameraDistance);
        const p2 = this.projectCardPoint(halfW, halfH, pitch, yaw, cameraDistance);
        const p3 = this.projectCardPoint(-halfW, halfH, pitch, yaw, cameraDistance);

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
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);

        const xYaw = x * cosY;
        const zYaw = -x * sinY;

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