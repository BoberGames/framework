import { ReelCfg, SymId } from "../../cfg/ReelCfg";

export interface Cluster {
    id: SymId;
    cells: { r: number; c: number }[];
    hasWild: boolean
}

export class CascadeModel {
    constructor() {}

    /** Generate grid in shape grid[col][row] */
    public generateRandomSymbolGrid(cols = 6, rows = 5): SymId[][] {
        const pool: SymId[] = ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II"];
        const grid: SymId[][] = [];

        for (let c = 0; c < cols; c++) {
            const col: SymId[] = [];
            for (let r = 0; r < rows; r++) {
                col.push(pool[Math.floor(Math.random() * pool.length)]);
            }
            grid.push(col);
        }
        return grid;
    }

    public getRandomSymId(): SymId {
        const pool: SymId[] = ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II"];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /** Full BFS cluster detection with WD acting as connector */
    public getClusters(grid: (SymId | null)[][]): Cluster[] {
        const rows = grid.length;
        if (!rows) return [];
        const cols = grid[0].length;

        const visited = new Set<string>();
        const clusters: Cluster[] = [];

        const dirs = [
            [1, 0], [-1, 0],
            [0, 1], [0, -1],
        ];

        const key = (r: number, c: number) => `${r},${c}`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const start = grid[r][c];
                const startKey = key(r, c);

                if (!start || start === ReelCfg.spineIds.WD) continue;
                if (visited.has(startKey)) continue;

                const queue = [{ r, c }];
                const baseCells: { r: number; c: number }[] = [];
                const wildCells: { r: number; c: number }[] = [];

                visited.add(startKey);

                while (queue.length) {
                    const cur = queue.shift()!;
                    baseCells.push(cur);

                    for (const [dr, dc] of dirs) {
                        const nr = cur.r + dr;
                        const nc = cur.c + dc;

                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

                        const cell = grid[nr][nc];
                        const k = key(nr, nc);

                        if (!cell) continue;

                        // 🌟 WD → include AND traverse through it
                        if (cell === ReelCfg.spineIds.WD) {
                            // add wild if not already added
                            if (!wildCells.some(w => w.r === nr && w.c === nc)) {
                                wildCells.push({ r: nr, c: nc });
                            }

                            // 🔑 traverse beyond WD
                            for (const [wr, wc] of dirs) {
                                const xr = nr + wr;
                                const xc = nc + wc;
                                if (xr < 0 || xr >= rows || xc < 0 || xc >= cols) continue;

                                const next = grid[xr][xc];
                                const nk = key(xr, xc);

                                if (next === start && !visited.has(nk)) {
                                    visited.add(nk);
                                    queue.push({ r: xr, c: xc });
                                }
                            }

                            continue;
                        }

                        // ✅ same symbol
                        if (cell === start && !visited.has(k)) {
                            visited.add(k);
                            queue.push({ r: nr, c: nc });
                        }
                    }
                }

                clusters.push({
                    id: start,
                    cells: [...baseCells, ...wildCells],
                    hasWild: wildCells.length > 0,
                });
            }
        }

        return clusters;
    }





    /** Return clusters only >= minSize */
    public getClustersOfMinSize(grid: (SymId | null)[][], minSize = 5): Cluster[] {
        return this.getClusters(grid).filter(c => c.cells.length >= minSize);
    }
}
