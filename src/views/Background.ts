import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { dispatcher } from "../index";
import { TextFeed } from "../TextFeed";
import { ReelCfg } from "../cfg/ReelCfg";
import { getSpine, playAnticipation, playWin, runAnimationMixer } from "../utils/spine-example";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { RadialExplosion } from "../utils/ExplosionParticle";
import gsap from "gsap";

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

        bg.interactive = true;
        bg.on("pointerdown", () => {
            dispatcher.emit("SPIN");
        });

        this.addChild(bg);
        this.addChild(bg_pad);

        const bgSpine = Spine.from({
            skeleton: "baseBg:data",
            atlas:    "baseBg:atlas",
            scale: 1,
        });

        // bgSpine.state.setAnimation(0, "WIND", true);
        // this.addChild(bgSpine);


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
        const cactus = await getSpine();
        cactus.position.set(this.width * 0.17, this.height * 0.86);
        cactus.state.setAnimation(0, "IDLE_1_DAY", true);


        this.addChild(cactus);


        let mixer: ReturnType<typeof runAnimationMixer> | null = null;

        function startMixer() {
            // safety: never double-start
            mixer?.stop();
            mixer = runAnimationMixer(cactus);
        }

        function stopMixer() {
            mixer?.stop();
            mixer = null;
        }
        startMixer();
        dispatcher.on("ANTICIPATE", async () => {

        });

        dispatcher.on("SNEEZE", async () => {
            stopMixer(); // 🔴 kill ambient loop

            await playWin(cactus);

            startMixer(); // 🟢 fresh mixer instance


        });
        const part = new RadialExplosion(this.app);
        this.addChildAt(part, 1);
        dispatcher.on("SHOOT", async () => {
            part.explode(
                cactus.x,
                cactus.y - 200,
                [Texture.from("character/spike")],
                80, // number of particles
            );
        });
    }
}