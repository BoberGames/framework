import { Assets, Container, Sprite } from "pixi.js";
import { dispatcher } from "../index";

export class Background extends Container {
    constructor() {
        super();
        this.createBaseBg();
    }

    private createBaseBg() {
        const bg = new Sprite(Assets.get("background/BACKGROUND"));

        bg.interactive = true;
        bg.on('pointerdown', () => {
            dispatcher.emit("SPIN");
        });
        this.addChild(bg);
    }
}