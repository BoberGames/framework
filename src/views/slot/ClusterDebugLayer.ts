import { Graphics, Container } from "pixi.js";

export class ClusterDebugLayer extends Container {
    private outlineColor = 0xff0000;
    private thickness = 6;

    constructor() {
        super();
        this.visible = false;
    }

    /** Draw outlines around cluster cells */
    public drawCells(cells: { r: number; c: number }[], getX: (c:number)=>number, getY:(r:number)=>number, size: number) {
        this.removeChildren();

        for (const { r, c } of cells) {
            const g = new Graphics();
            g.lineStyle(this.thickness, this.outlineColor, 0.9);
            g.drawRect(getX(c), getY(r), size, size);
            this.addChild(g);
        }

        this.visible = true;
    }

    public clearDebug() {
        this.removeChildren();
        this.visible = false;
    }
}
