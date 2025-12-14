import { Assets, Container, Sprite } from "pixi.js";
import { dispatcher } from "../index";
import { TextFeed } from "../TextFeed";
import { ReelCfg } from "../cfg/ReelCfg";
import { getSpine, playAnticipation, runAnimationMixer } from "../utils/spine-example";

export class Background extends Container {
    constructor() {
        super();
        this.createBaseBg();
    }

    private async createBaseBg() {
        const bg = new Sprite(Assets.get("background/BACKGROUND"));

        bg.interactive = true;
        bg.on("pointerdown", () => {
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
                feed.addMessage("CLUSTER of " + item.cells.length + "X " + ReelCfg.spineIds[item.id]);
            }
        });
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
            stopMixer();                     // 🔴 kill ambient loop

            await playAnticipation(cactus);  // ▶ anticipation anim

            startMixer();                    // 🟢 fresh mixer instance
        });
    }
}