import {Container} from "pixi.js";
import gsap from "gsap";
import { Symbol } from "./Symbol";
import { ReelCfg, SymId } from "../../cfg/ReelCfg";
import { CascadeModel } from "./CascadeModel";
import { dispatcher } from "../../index";

const FALLING_DURATION = 0.5;
const STAGGER_DELAY = 0.1;

export class CascadeView extends Container {

    public grid: (Symbol | null)[][];
    private symbolSize: number = 200;
    public symsToDestroy: Symbol[];
    private scatterSoundPlayed = false;
    private popRows = new Array(7).fill(1);
    private slotModel: CascadeModel;
    private readyToDrop: boolean = true;

    constructor() {
        super();
        this.grid = [];
        this.symsToDestroy = [];
        this.slotModel = new CascadeModel()
        this.showInitialScreen(this.slotModel.generateRandomSymbolGrid())
        dispatcher.on("SPIN", async () => {
            if(!this.readyToDrop) return

            this.readyToDrop = false
            await this.clearBoard();
            await gsap.delayedCall(1, async () => {});
            await this.dropNewBoard(this.slotModel.generateRandomSymbolGrid());
            this.readyToDrop = true;
        });
    }

    /**
     * Builds the initial board UI from a 2D array of symbol IDs.
     * @param initialScreen - The 2D array of symbol IDs that represent the initial state.
     */
    public showInitialScreen(initialScreen: string[][]): void {

        for (let col = 0; col < initialScreen.length; col++) {
            this.grid[col] = [];
            for (let row = 0; row < initialScreen[col].length; row++) {
                const symbolId: SymId = initialScreen[col][row] as SymId;
                const symbol = new Symbol(symbolId);

                this.setPositionAndAddToBoard(symbol, col, row);
            }
        }
    }

    /**
     * Helper method to calculate the symbol's X position based on column.
     * @param col - The column index.
     */
    private getSymbolX(col: number): number {
        return 500 + col * 200;
    }

    /**
     * Helper method to calculate the symbol's Y position based on row.
     * @param row - The row index.
     */
    private getSymbolY(row: number): number {
        return 150 + this.symbolSize * row;
    }

    /**
     * Clears the board by animating each symbol falling out, optionally preserving multipliers if in free spins.
     */
    public async clearBoard(): Promise<void> {

        let remainingAnimations = 0;

        const isTurboMode = false;

        return new Promise<void>((resolve) => {
            for (let col = 0; col < this.grid.length; col++) {
                for (let row = 0; row < this.grid[col].length; row++) {
                    const symbol = this.grid[col][row];

                    if (symbol) {
                        symbol.eventMode = 'none';
                        remainingAnimations++;
                        gsap.to(symbol, {
                            y: symbol.y + 1050,
                            duration: isTurboMode ? FALLING_DURATION / 2 : FALLING_DURATION,
                            delay: isTurboMode ? STAGGER_DELAY : col * STAGGER_DELAY,
                            onComplete: () => {
                                this.removeChild(symbol);
                                gsap.killTweensOf(symbol);
                                symbol.destroy();
                                remainingAnimations--;
                                if (remainingAnimations === 0) {
                                    resolve();
                                }
                            }
                        });
                    }
                }
            }

            // If no symbols to animate, resolve immediately
            if (remainingAnimations === 0) {
                resolve();
            }
        });
    }

    /**
     * Helper method for positioning a Symbol in the grid and on the stage.
     * @param symbol - The Symbol to place.
     * @param col - The column index.
     * @param row - The row index.
     */
    private setPositionAndAddToBoard(symbol: Symbol, col: number, row: number): void {
        symbol.x = this.getSymbolX(col);
        symbol.y = this.getSymbolY(row);

        this.grid[col][row] = symbol;
        this.symsToDestroy.push(symbol);
        this.addChild(symbol);
    }

    /**
     * Drops new symbols onto the board with a falling animation.
     * @param newSymbols - A 2D array of symbol IDs for the new board state.
     */
    public async dropNewBoard(newSymbols: string[][]): Promise<void> {
        this.removeExplodedSymbols();

        let remainingSymbolsToDrop = 0;
        const isTurboMode = false;

        this.scatterSoundPlayed = false;
        this.popRows = new Array(7).fill(1);

        return new Promise<void>((resolve) => {
            for (let col = 0; col < newSymbols.length; col++) {
                this.grid[col] = [];
                for (let row = 0; row < newSymbols[col].length; row++) {
                    remainingSymbolsToDrop++;
                    const symbolId: SymId = newSymbols[col][row] as SymId;
                    const symbol = new Symbol(symbolId);


                    symbol.x = this.getSymbolX(col);
                    symbol.y = -500 - 20 * col;

                    this.grid[col][row] = symbol;
                    this.addChild(symbol);

                    // Calculate the base delay
                    const delay = (newSymbols[col].length - 1 - row) * STAGGER_DELAY;

                    gsap.to(symbol, {
                        onStart: () => {
                            if (col === 0 && row === 0) {
                                // Sound.manager.play('reelStop');
                            }
                        },
                        y: this.getSymbolY(row),
                        duration: isTurboMode ? FALLING_DURATION / 2 : FALLING_DURATION,
                        delay: delay,
                        onComplete: () => {
                            symbol.showLanding();
                            if (symbolId === ReelCfg.scatterId && !this.scatterSoundPlayed) {
                                // Sound.manager.setVolume(0.8, 'scatter');
                                // Sound.manager.play('scatter');
                                this.scatterSoundPlayed = true;
                            }

                            remainingSymbolsToDrop--;
                            if (remainingSymbolsToDrop === 0) {
                                resolve();
                            }
                        }
                    });
                }
            }
            if (remainingSymbolsToDrop === 0) {
                resolve();
            }
        });
    }



    /**
     * Marks symbols at given coordinates for removal (explosion), storing them in symsToDestroy.
     * @param coordinates - An array of [row, col] coordinates for the cluster.
     */
    public async explodeCluster(coordinates: [number, number][]): Promise<void> {
        const ids = [];
        let lastPromise: Promise<void> = Promise.resolve();

        for (const [row, col] of coordinates) {
            const symbol = this.grid[row]?.[col];

            if (symbol) {
                ids.push(symbol.getId());
                lastPromise = symbol.showWinAnim();
                this.symsToDestroy.push(symbol);
            }
        }
        // const filteredIds = [...new Set(ids)];

        // filteredIds.forEach(id => {
        //     // Sound.manager.play(id);
        // });

        await lastPromise;
    }


    public async showSymbolsAnimById(symbolId: string): Promise<void> {
        let lastPromise: Promise<void> = Promise.resolve();

        for (let col = 0; col < this.grid.length; col++) {
            if (!this.grid[col]) continue;

            for (let row = 0; row < this.grid[col].length; row++) {
                const symbol = this.grid[col][row];

                if (symbol && symbol.id === symbolId) {
                    lastPromise = symbol.showWinAnim();
                    this.symsToDestroy.push(symbol);
                }
            }
        }

        await lastPromise;
    }


    /**
     * Removes exploded symbols from both the stage and the grid.
     */
    private removeExplodedSymbols(): void {
        this.symsToDestroy.forEach((sym) => {
            if(!sym) return

            gsap.killTweensOf(sym);
            this.removeChild(sym);
            sym.destroy();
        });

        this.symsToDestroy = [];
    }

    private clearGrid(coordinates: [number, number][]): void {
        for (const [row, col] of coordinates) {
            this.grid[row][col] = null;
        }
    }

    /**
     * Makes symbols "fall down" to fill empty spaces, with a small animation.
     * @returns A Promise that resolves once all symbols have settled.
     */
    public async dropHangingSymbols(): Promise<void> {
        const newGrid: (Symbol | null)[][] = this.grid.map((col) => {
            const nulls = col.filter((item) => item === null);
            const symbols = col.filter((item) => item !== null);

            // Put empty spaces first => symbol "rises"
            // or empty spaces last => symbol "drops"
            //
            // Usually, row = 0 is top, so "nulls at top" means symbols go down.
            // We'll keep the original logic here: nulls first, symbols last
            return [...nulls, ...symbols];
        });

        let animatedSymbols = 0;
        const isTurboMode = false;

        return new Promise<void>((resolve) => {
            for (let col = 0; col < newGrid.length; col++) {
                for (let row = 0; row < newGrid[col].length; row++) {
                    const symbol = newGrid[col][row];

                    if (symbol) {
                        animatedSymbols++;
                        gsap.to(symbol, {
                            y: this.getSymbolY(row),
                            duration: isTurboMode ? FALLING_DURATION * 0.5 : FALLING_DURATION,
                            ease: "power3.out",
                            onComplete: () => {
                                animatedSymbols--;
                                if (animatedSymbols === 0) {
                                    // Sound.manager.setVolume(0.6, 'collision');
                                    // Sound.manager.play('collision');
                                    resolve();
                                }
                            }
                        });
                    }
                }
            }
            this.grid = newGrid;

            if (animatedSymbols === 0) {
                resolve();
            }
        });
    }

    /**
     * Updates the board with new data. Symbols that do not exist yet will be
     * created and dropped in. Existing symbols remain untouched if they match.
     * @param newData - A 2D array of symbol IDs for the updated board.
     */
    public async updateBoardWithNewData(newData: string[][]): Promise<void> {
        let remainingSymbolsToAnimate = 0;
        const isTurboMode = false;

        this.popRows = new Array(7).fill(1);

        for (let col = 0; col < newData.length; col++) {
            for (let row = 0; row < newData[col].length; row++) {
                if (!this.grid[col][row]) {
                    remainingSymbolsToAnimate++;
                    const symbolId: SymId = newData[col][row] as SymId;
                    const newSymbol = new Symbol(symbolId);

                    newSymbol.scale.set(0.45);

                    newSymbol.x = this.getSymbolX(col);
                    newSymbol.y = -300 - 20 * col;

                    this.grid[col][row] = newSymbol;
                    this.addChild(newSymbol);

                    gsap.to(newSymbol, {
                        y: this.getSymbolY(row),
                        duration: isTurboMode ? FALLING_DURATION * 0.5 : FALLING_DURATION,
                        delay: (newData[col].length - 1 - row) * STAGGER_DELAY,
                        ease: "power1.out",
                        onComplete: () => {
                            if (symbolId === ReelCfg.scatterId && !this.scatterSoundPlayed) {
                                // Sound.manager.setVolume(0.8, 'scatter');
                                // Sound.manager.play('scatter');
                                this.scatterSoundPlayed = true;
                            }

                            if (this.popRows[row]) {
                                // Sound.manager.setVolume(0.6, 'collision');
                                // Sound.manager.play('collision');
                                this.popRows[row] = 0;
                            }

                            newSymbol.showLanding();
                            remainingSymbolsToAnimate--;
                        }
                    });
                }
            }
        }

        if (remainingSymbolsToAnimate === 0) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            const checkCompletion = setInterval(() => {
                if (remainingSymbolsToAnimate === 0) {
                    clearInterval(checkCompletion);
                    resolve();
                }
            }, 10);
        });
    }


    /**
     * Finds the Symbol in the middle of a cluster by sorting coordinates and picking the midpoint.
     * If the resulting middle coordinate is at the grid’s edge (0 or 6), we shift it to 1 or 5
     * so that the win text won't go partially off-screen.
     *
     * @param coordinates - The array of [row, col] positions.
     * @returns The "middle" symbol in the cluster or null if none found.
     */
    private findMiddleSymbol(coordinates: [number, number][]): Symbol | null {
        if (coordinates.length === 0) {
            return null;
        }

        // Make a copy and sort by row (first element) then by column.
        const sortedCoordinates = coordinates.slice().sort((a, b) => {
            if (a[0] !== b[0]) {
                return a[0] - b[0];
            }

            return a[1] - b[1];
        });

        let midRow: number;
        let midCol: number;
        const count = sortedCoordinates.length;

        // For an odd number, take the middle point directly.
        // For an even number, average the two middle coordinates.
        if (count % 2 === 1) {
            [midRow, midCol] = sortedCoordinates[Math.floor(count / 2)];
        } else {
            const [row1, col1] = sortedCoordinates[count / 2 - 1];
            const [row2, col2] = sortedCoordinates[count / 2];

            midRow = Math.round((row1 + row2) / 2);
            midCol = Math.round((col1 + col2) / 2);
        }

        // Return the symbol from the grid if it exists.
        return this.grid[midRow]?.[midCol] || null;
    }
}