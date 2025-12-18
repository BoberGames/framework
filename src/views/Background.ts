import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import { dispatcher } from "../index";
import { TextFeed } from "../TextFeed";
import { ReelCfg } from "../cfg/ReelCfg";
import { getSpine, playAnticipation, playWin, runAnimationMixer } from "../utils/spine-example";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { RadialExplosion } from "../utils/ExplosionParticle";
import gsap from "gsap";
import * as fs from "node:fs";

export class Background extends Container {
    private app: Application;

    constructor(app: Application) {
        super();
        this.app = app;
        this.createBaseBg();
    }

    private async createBaseBg() {
        const bg = new Sprite(Assets.get("background/BACKGROUND"));
        const bg_pad = new Sprite(Assets.get("background/MULTIPLIER_PAD"));
        bg_pad.setSize(bg.width, bg.height);
        bg_pad.alpha = 0;
        bg.interactive = true;
        bg.on("pointerdown", () => {
            dispatcher.emit("SPIN");
        });

        this.addChild(bg);

        const bgSpine = Spine.from({
            skeleton: "baseBg:data",
            atlas:    "baseBg:atlas",
            scale: 1,
        });

        bgSpine.setSize(bg.width, bg.height);
        bgSpine.position.set(bg.width * 0.5, bg.height * 0.5);
        bgSpine.state.setAnimation(0, "DESKTOPBG_DAY_BIRD", true);

        const bell = Spine.from({
            skeleton: "bell:data",
            atlas:    "bell:atlas",
            scale: 1,
        });
        bell.state.setAnimation(0, "BELL", true);
        bell.position.set(bg.width * 0.5, bg.height * 0.5);

        const wind = Spine.from({
            skeleton: "wind:data",
            atlas:    "wind:atlas",
            scale: 1,
        });
        wind.state.setAnimation(0, "WIND", true);
        wind.position.set(bg.width * 0.5, bg.height * 0.5);

        const whiteBg = new Graphics().rect(bg.x, bg.y, bg.width, bg.height).fill(0xFFFFFF);
        whiteBg.alpha = 0.1;

        const fsCont = new Container();
        const fsBg = Spine.from({
            skeleton: "fsBg:data",
            atlas:    "fsBg:atlas",
            scale: 1,
        });

        fsBg.setSize(bg.width, bg.height);
        fsBg.position.set(bg.width * 0.5, bg.height * 0.5);
        fsBg.state.setAnimation(0, "DESKTOPBG_NIGHT", true);

        const lizzards = Spine.from({
            skeleton: "lizzards:data",
            atlas:    "lizzards:atlas",
            scale: 0.6,
        });

        lizzards.position.set(bg.width * 0.92, bg.height * 0.83);
        lizzards.state.setAnimation(0, "IDLE", true);
        fsCont.addChild(fsBg, lizzards);
        fsCont.scale.set(1.005);
        fsCont.x -= 5;
        fsCont.y -= 3;
        fsCont.alpha = 0;

        this.addChild(bgSpine);
        this.addChild(bell);
        this.addChild(wind);
        this.addChild(whiteBg);
        this.addChild(fsCont);
        this.addChild(bg_pad);


        // const feed = new TextFeed();
        //
        // feed.container.y = this.height - feed.container.height;
        //
        // this.addChild(feed.container);
        //
        // dispatcher.on("CLUSTER", (data: any) => {
        //     // @ts-ignore
        //     for (const item of data) {
        //         // @ts-ignore
        //         feed.addMessage("CLUSTER of " + item.cells.length + "X " + ReelCfg.spineIds[item.id]);
        //     }
        // });
        let fsVisible = false;

        dispatcher.on("FS", () => {
            fsVisible = !fsVisible;

            gsap.killTweensOf(fsCont);

            gsap.to(fsCont, {
                alpha: fsVisible ? 1 : 0,
                duration: 0.5
            });
            dispatcher.emit("RESET_FS")
        });
    }
}