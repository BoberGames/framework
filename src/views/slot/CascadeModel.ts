import { SymId } from "../../cfg/ReelCfg";

export interface Cluster {
    id: SymId;
    cells: { r: number; c: number }[];
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

    /** Full BFS cluster detection: grid is [row][col] */
    public getClusters(grid: (SymId | null)[][]): Cluster[] {
        const rows = grid.length;
        if (rows === 0) return [];
        const cols = grid[0].length;

        const visited = new Set<string>();
        const clusters: Cluster[] = [];

        const dirs = [
            [1, 0], [-1, 0],
            [0, 1], [0, -1]
        ];

        const key = (r: number, c: number) => `${r},${c}`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const k = key(r, c);
                if (visited.has(k)) continue;

                const target = grid[r][c];
                visited.add(k);

                if (!target) continue;

                const queue = [{ r, c }];
                const group: { r: number; c: number }[] = [];

                while (queue.length) {
                    const cur = queue.shift()!;
                    group.push(cur);

                    for (const [dr, dc] of dirs) {
                        const nr = cur.r + dr;
                        const nc = cur.c + dc;

                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

                        const nk = key(nr, nc);
                        if (visited.has(nk)) continue;
                        if (grid[nr][nc] !== target) continue;

                        visited.add(nk);
                        queue.push({ r: nr, c: nc });
                    }
                }

                clusters.push({ id: target, cells: group });
            }
        }

        return clusters;
    }

    /** Return clusters only >= minSize */
    public getClustersOfMinSize(grid: (SymId | null)[][], minSize = 5): Cluster[] {
        return this.getClusters(grid).filter(c => c.cells.length >= minSize);
    }
}
