import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import { Symbol } from "./Symbol";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import { CascadeModel } from "./CascadeModel";
import { dispatcher } from "../../index";

const FALLING_DURATION = 0.3;
const STAGGER_DELAY = 0.1;

export class CascadeView extends Container {
    public grid: (Symbol | null)[][] = [];
    public symsToDestroy: Symbol[] = [];

    private symbolSize = 180;
    private slotModel = new CascadeModel();
    private readyToDrop = true;
    private spinCount = 0;


    /** count of non-winning consecutive spins */
    private nonWinningSpinStreak = 0;

    private gridMask!: Graphics;

    constructor() {
        super();

        // initial board
        this.showInitialScreen(this.slotModel.generateRandomSymbolGrid());
        let hasScatter = false;
        dispatcher.on("RESET_FS", () => hasScatter = false);
        /** SPIN HANDLER */
        dispatcher.on("SPIN", async () => {
            if (!this.readyToDrop) return;
            this.readyToDrop = false;

            this.spinCount++; // ⬅️ global spin counter

            await this.clearBoard();

            const cols = this.grid.length || 6;
            const rows = this.grid[0]?.length || 5;

            this.grid = this.createEmptyGrid(cols, rows);

            await gsap.delayedCall(0.3, () => {});

            // 1) Generate base grid
            let newGrid = this.slotModel.generateRandomSymbolGrid(cols, rows);

            // 2) 🎯 FORCE CLUSTER ON EVERY 3RD SPIN
            if (this.spinCount % 3 === 0) {
                newGrid = this.forceRandomBlobClusterOnGrid(newGrid);
            }

            // 3) 🌟 FORCE 3× SC ON EVERY 5TH SPIN
            if (this.spinCount % 5 === 0) {
                hasScatter = true;
                newGrid = this.forceRandomScatters(newGrid, 3);
            }

            // 4) Drop prepared board
            await this.dropNewBoard(newGrid);

            // 5) Run cascades as usual
            await this.handleCascadesAfterDrop(hasScatter);

            this.readyToDrop = true;
        });


    }

    private forceRandomBlobClusterOnGrid(grid: SymId[][]): SymId[][] {
        const cols = grid.length;
        const rows = grid[0].length;

        const size = 5 + Math.floor(Math.random() * 5); // 5–9
        let mainId: SymId;

        // Never force SC as cluster symbol
        do {
            mainId = this.slotModel.getRandomSymId();
        } while (mainId === "SC");

        // Find a valid start cell (not SC)
        let startC = 0;
        let startR = 0;
        let found = false;

        for (let i = 0; i < 50 && !found; i++) {
            startC = Math.floor(Math.random() * cols);
            startR = Math.floor(Math.random() * rows);
            if (grid[startC][startR] !== "SC") found = true;
        }

        if (!found) return grid; // safety exit

        const blob: { c: number; r: number }[] = [];
        const queue = [{ c: startC, r: startR }];
        const used = new Set<string>();

        const dirs = [
            [1, 0], [-1, 0],
            [0, 1], [0, -1]
        ];

        while (blob.length < size && queue.length) {
            const cur = queue.shift()!;
            const key = `${cur.c},${cur.r}`;

            if (used.has(key)) continue;
            used.add(key);

            // 🚫 Skip SC cells completely
            if (grid[cur.c][cur.r] === "SC") continue;

            blob.push(cur);

            for (const [dc, dr] of dirs) {
                const nc = cur.c + dc;
                const nr = cur.r + dr;

                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                if (grid[nc][nr] === "SC") continue;

                queue.push({ c: nc, r: nr });
            }
        }

        if (blob.length < 5) return grid; // safety: no forced win

        // 🎯 Inject exactly one WD inside the blob
        const wdIndex = Math.floor(Math.random() * blob.length);

        for (let i = 0; i < blob.length; i++) {
            const { c, r } = blob[i];
            grid[c][r] = (i === wdIndex ? "WD" : mainId) as SymId;
        }

        return grid;
    }


    private forceRandomScatters(
        grid: SymId[][],
        count = 3
    ): SymId[][] {
        const cols = grid.length;
        const rows = grid[0].length;

        // collect all non-SC cells
        const candidates: { c: number; r: number }[] = [];

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (grid[c][r] !== "SC") {
                    candidates.push({ c, r });
                }
            }
        }

        if (candidates.length < count) return grid;

        // shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        // force SC in exactly `count` places
        for (let i = 0; i < count; i++) {
            const { c, r } = candidates[i];
            grid[c][r] = "SC";
        }

        return grid;
    }


    private createEmptyGrid(cols: number, rows: number) {
        return Array.from({ length: cols }, () => Array<Symbol | null>(rows).fill(null));
    }

    private getSymbolX(c: number) { return 550 + c * this.symbolSize; }
    private getSymbolY(r: number) { return 180 + r * this.symbolSize; }

    /** MASK */
    private createGridMask() {
        if (!this.gridMask) {
            this.gridMask = new Graphics();
            this.addChild(this.gridMask);
        }

        this.gridMask.clear();
        this.gridMask.beginFill(0xffffff, 1);
        this.gridMask.drawRect(0, 0, 1920, 1080);
        this.gridMask.endFill();

        this.mask = this.gridMask;
    }

    /** INITIAL BOARD */
    public showInitialScreen(initial: string[][]) {
        for (let c = 0; c < initial.length; c++) {
            this.grid[c] = [];
            for (let r = 0; r < initial[c].length; r++) {
                const s = new Symbol(initial[c][r] as SymId);
                this.setPosition(s, c, r);
            }
        }
        this.createGridMask();
    }

    private setPosition(sym: Symbol, c: number, r: number) {
        sym.x = this.getSymbolX(c);
        sym.y = this.getSymbolY(r);

        this.grid[c][r] = sym;
        this.addChild(sym);
    }

    /** CLEAR BOARD ANIMATION */
    public async clearBoard() {
        let running = 0;

        return new Promise<void>((resolve) => {
            for (let c = 0; c < this.grid.length; c++) {
                for (let r = 0; r < this.grid[c].length; r++) {
                    const sym = this.grid[c][r];
                    if (!sym) continue;

                    running++;
                    gsap.to(sym, {
                        y: sym.y + 1000,
                        duration: FALLING_DURATION,
                        delay: c * STAGGER_DELAY,
                        onComplete: () => {
                            this.removeChild(sym);
                            sym.destroy();
                            running--;
                            if (running === 0) resolve();
                        }
                    });
                }
            }
            if (running === 0) resolve();
        });
    }

    /** DROP NEW BOARD */
    public async dropNewBoard(newGrid: string[][]): Promise<void> {
        let running = 0;

        return new Promise<void>((resolve) => {
            for (let c = 0; c < newGrid.length; c++) {
                this.grid[c] = [];

                for (let r = 0; r < newGrid[c].length; r++) {
                    running++;

                    const s = new Symbol(newGrid[c][r] as SymId);
                    s.x = this.getSymbolX(c);
                    s.y = -300 - c * 20;

                    this.grid[c][r] = s;
                    this.addChild(s);
                    if(s.id === ReelCfg.spineIds.SC || s.id === ReelCfg.spineIds.WD) {
                        s.zIndex = 50;
                    }
                    gsap.to(s, {
                        y: this.getSymbolY(r),
                        duration: FALLING_DURATION,
                        delay: (newGrid[c].length - 1 - r) * STAGGER_DELAY,
                        onComplete: () => {
                            s.showLanding();
                            running--;
                            if (running === 0) resolve();
                        }
                    });
                }
            }
        });
    }

    /** EXPLOSION */
    public async explodeClusterFromClusters(
        clusters: { cells: { r:number, c:number }[], hasWild: boolean }[]
    ) {
        const coords: [number, number][] = [];
        let hasWild = false;

        for (const cl of clusters) {
            hasWild ||= cl.hasWild; // ✅ accumulate
            for (const { r, c } of cl.cells) coords.push([r, c]);
        }

        await this.explodeCluster(coords, hasWild);
    }

    public async explodeCluster(coords: [number, number][], hasWild: boolean) {
        const syms: Symbol[] = [];

        for (const [r, c] of coords) {
            const sym = this.grid[c][r];
            if (!sym) continue;

            this.grid[c][r] = null;
            this.symsToDestroy.push(sym);
            syms.push(sym);
        }

        // ✅ Phase 1: all symbols play WIN first
        await Promise.all(syms.map(s => s.playWinOnly()));

        // ✅ Phase 2: only if wild exists, then balloon phase
        if (hasWild) {
            // single shared POP signal (no race per symbol)
            const popSignal = new Promise<void>((resolve) => {
                dispatcher.once("POP", () => resolve());
            });

            // start balloon landing + register waits BEFORE sneeze
            const balloonPromises = syms.map(s => s.playBalloonAfterPop(popSignal));

            // emit sneeze after everyone has subscribed
            gsap.delayedCall(0.1, () => dispatcher.emit("SNEEZE"));

            await Promise.all(balloonPromises);
        }

        this.removeExploded();
    }

    private removeExploded() {
        for (const sym of this.symsToDestroy) {
            if (!sym) continue;
            this.removeChild(sym);
            sym.destroy();
        }
        this.symsToDestroy = [];
    }

    /** DROP HANGING SYMBOLS */
    public async dropHangingSymbols() {
        const cols = this.grid.length;
        const rows = this.grid[0].length;

        const newGrid = this.createEmptyGrid(cols, rows);
        let running = 0;

        // Collapse columns
        for (let c = 0; c < cols; c++) {
            const symbols = this.grid[c].filter(s => s !== null) as Symbol[];
            const nulls = rows - symbols.length;

            for (let i = 0; i < symbols.length; i++) {
                const targetRow = nulls + i;
                const s = symbols[i];
                newGrid[c][targetRow] = s;

                running++;
                // @ts-ignore
                gsap.to(s, {
                    y: this.getSymbolY(targetRow),
                    duration: FALLING_DURATION,
                    ease: "power2.out",
                    // @ts-ignore
                    onComplete: () => running--
                });
            }
        }

        // Fill with new symbols
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (!newGrid[c][r]) {
                    const id = this.slotModel.getRandomSymId();
                    const s = new Symbol(id);

                    s.x = this.getSymbolX(c);
                    s.y = -300 - c * 20;

                    newGrid[c][r] = s;
                    this.addChild(s);

                    running++;
                    gsap.to(s, {
                        y: this.getSymbolY(r),
                        duration: FALLING_DURATION,
                        delay: (rows - 1 - r) * STAGGER_DELAY,
                        onComplete: () => {
                            s.showLanding();
                            running--;
                        }
                    });
                }
            }
        }

        this.grid = newGrid;

        if (running === 0) return;

        return new Promise<void>(res => {
            const t = setInterval(() => {
                if (running === 0) {
                    clearInterval(t);
                    res();
                }
            }, 16);
        });
    }

    /** DETECT CLUSTERS (5+) */
    private detectClusters() {
        const cols = this.grid.length;
        const rows = this.grid[0].length;

        const modelGrid: (SymId | null)[][] = [];

        for (let r = 0; r < rows; r++) {
            const row: (SymId | null)[] = [];
            for (let c = 0; c < cols; c++) {
                const cell = this.grid[c][r];
                row.push(cell ? (cell.id as SymId) : null);
            }
            modelGrid.push(row);
        }

        return this.slotModel.getClustersOfMinSize(modelGrid, 5);
    }

    /** MAIN CASCADE LOOP */
    private async handleCascadesAfterDrop(hasScatter: boolean = false) {
        let clusters = this.detectClusters();

        // Update spin streak
        if (clusters.length === 0) this.nonWinningSpinStreak++;
        else this.nonWinningSpinStreak = 0;
        let anticipateShown = false;

        while (clusters.length > 0) {
            if(!anticipateShown) {
                anticipateShown = true;
                dispatcher.emit("ANTICIPATE");
            }

            await this.explodeClusterFromClusters(clusters);
            await this.dropHangingSymbols();

            clusters = this.detectClusters();
        }

        // 🌟 AFTER ALL CASCADES → PLAY SCATTER WINS
        if (hasScatter) {
            await this.playScatterWins();
            dispatcher.emit("FS")
        }
    }


    private async playScatterWins(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (let c = 0; c < this.grid.length; c++) {
            for (let r = 0; r < this.grid[c].length; r++) {
                const sym = this.grid[c][r];
                if (!sym) continue;

                if (sym.id === "SCATTER") {
                    // No wild logic for scatter
                    promises.push(sym.showWinAnim(false));
                }
            }
        }

        await Promise.all(promises);

    }


}
