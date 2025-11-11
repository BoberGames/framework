import { SymId } from "../../cfg/ReelCfg";

export class CascadeModel {

    constructor() {
    }

    public generateRandomSymbolGrid(rows = 6, cols = 5): SymId[][] {
        const symbols: SymId[] = ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II"];

        const grid: SymId[][] = [];

        for (let i = 0; i < rows; i++) {
            const row: SymId[] = [];

            for (let j = 0; j < cols; j++) {
                const random = Math.floor(Math.random() * symbols.length);

                row.push(symbols[random]);
            }
            grid.push(row);
        }

        return grid;
    }

}
