import { Assets, Container, Sprite } from "pixi.js";
import { dispatcher } from "../index";
import { TextFeed } from "../TextFeed";
import { ReelCfg } from "../cfg/ReelCfg";

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
        const feed = new TextFeed();

        feed.container.y = this.height - feed.container.height;

        this.addChild(feed.container);
        
        dispatcher.on("CLUSTER", (data: any) => {
            // @ts-ignore
            for (const item of data) {
                // @ts-ignore
                feed.addMessage("CLUSTER of " + item.cells.length + "X " +  ReelCfg.spineIds[item.id]);
            }
        })
    }
}