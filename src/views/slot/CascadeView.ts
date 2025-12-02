import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import { Symbol } from "./Symbol";
import { SymId } from "../../cfg/ReelCfg";
import { CascadeModel } from "./CascadeModel";
import { dispatcher } from "../../index";

const FALLING_DURATION = 0.5;
const STAGGER_DELAY = 0.1;

export class CascadeView extends Container {
    public grid: (Symbol | null)[][] = [];
    public symsToDestroy: Symbol[] = [];

    private symbolSize = 200;
    private slotModel = new CascadeModel();
    private readyToDrop = true;

    /** count of non-winning consecutive spins */
    private nonWinningSpinStreak = 0;

    private gridMask!: Graphics;

    constructor() {
        super();

        // initial board
        this.showInitialScreen(this.slotModel.generateRandomSymbolGrid());

        /** SPIN HANDLER */
        dispatcher.on("SPIN", async () => {
            if (!this.readyToDrop) return;
            this.readyToDrop = false;

            await this.clearBoard();

            const cols = this.grid.length || 6;
            const rows = this.grid[0]?.length || 5;

            this.grid = this.createEmptyGrid(cols, rows);

            await gsap.delayedCall(1, () => {});
// 1) Generate new grid
            let newGrid = this.slotModel.generateRandomSymbolGrid(cols, rows);

// 2) Check if we need to force cluster BEFORE dropping
            if (this.nonWinningSpinStreak >= 2) {
                newGrid = this.forceRandomBlobClusterOnGrid(newGrid);
                this.nonWinningSpinStreak = 0; // reset spin counter
            }

// 3) Drop prepared board
            await this.dropNewBoard(newGrid);

// 4) Run cascades as usual
            await this.handleCascadesAfterDrop();

            this.readyToDrop = true;
        });
    }

    private forceRandomBlobClusterOnGrid(grid: SymId[][]): SymId[][] {
        const cols = grid.length;
        const rows = grid[0].length;

        const size = 5 + Math.floor(Math.random() * 5); // 5–9 cells
        const id = this.slotModel.getRandomSymId();

        const startC = Math.floor(Math.random() * cols);
        const startR = Math.floor(Math.random() * rows);

        const blob: { c: number; r: number }[] = [];
        const queue = [{ c: startC, r: startR }];
        const used = new Set<string>();

        const dirs = [
            [1,0], [-1,0],
            [0,1], [0,-1]
        ];

        while (blob.length < size && queue.length) {
            const cur = queue.shift()!;
            const key = cur.c + "," + cur.r;
            if (used.has(key)) continue;
            used.add(key);
            blob.push(cur);

            for (const [dc, dr] of dirs) {
                const nc = cur.c + dc;
                const nr = cur.r + dr;
                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                queue.push({ c: nc, r: nr });
            }
        }

        // Apply cluster to the raw grid BEFORE drop
        for (const { c, r } of blob) {
            grid[c][r] = id;
        }

        return grid;
    }


    private createEmptyGrid(cols: number, rows: number) {
        return Array.from({ length: cols }, () => Array<Symbol | null>(rows).fill(null));
    }

    private getSymbolX(c: number) { return 550 + c * this.symbolSize; }
    private getSymbolY(r: number) { return 150 + r * this.symbolSize; }

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
    public async explodeClusterFromClusters(clusters: { cells: { r:number, c:number }[] }[]) {
        const coords: [number, number][] = [];
        for (const cl of clusters) {
            for (const { r, c } of cl.cells) {
                coords.push([r, c]);
            }
        }
        await this.explodeCluster(coords);
    }

    public async explodeCluster(coords: [number, number][]) {
        const promises: Promise<void>[] = [];

        for (const [r, c] of coords) {
            const sym = this.grid[c][r];
            if (!sym) continue;

            promises.push(sym.showWinAnim());
            this.grid[c][r] = null;
            this.symsToDestroy.push(sym);
        }

        await Promise.all(promises);
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

    /** FORCE NATURAL RANDOM BLOB CLUSTER */
    private forceRandomBlobCluster() {
        const cols = this.grid.length;
        const rows = this.grid[0].length;

        const size = 5 + Math.floor(Math.random() * 5); // 5–9 cells
        const id = this.slotModel.getRandomSymId();

        const startC = Math.floor(Math.random() * cols);
        const startR = Math.floor(Math.random() * rows);

        const toVisit = [{ c: startC, r: startR }];
        const blob: { c: number; r: number }[] = [];
        const used = new Set<string>();

        const dirs = [
            [1,0], [-1,0],
            [0,1], [0,-1]
        ];

        while (blob.length < size && toVisit.length) {
            const cur = toVisit.shift()!;
            const k = cur.c + "," + cur.r;
            if (used.has(k)) continue;
            used.add(k);
            blob.push(cur);

            for (const [dc, dr] of dirs) {
                const nc = cur.c + dc;
                const nr = cur.r + dr;
                if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                toVisit.push({ c: nc, r: nr });
            }
        }

        // Apply forced cluster
        for (const { c, r } of blob) {
            const existing = this.grid[c][r];
            if (existing) {
                this.removeChild(existing);
                existing.destroy();
            }
            const s = new Symbol(id);
            this.setPosition(s, c, r);
        }
    }


    /** MAIN CASCADE LOOP */
    private async handleCascadesAfterDrop() {
        let clusters = this.detectClusters();

        // Update spin streak: win = reset, no win = add streak
        if (clusters.length === 0) this.nonWinningSpinStreak++;
        else this.nonWinningSpinStreak = 0;

        while (clusters.length > 0) {
            dispatcher.emit("CLUSTER", clusters);

            await this.explodeClusterFromClusters(clusters);
            await this.dropHangingSymbols();

            clusters = this.detectClusters();
        }
    }

}
