import { Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { dispatcher } from "../index";

export class LogoView extends Container {
    constructor() {
        super();
        const logo = Spine.from({
            skeleton: "logo:data",
            atlas:    "logo:atlas",
            scale: 0.51,
        });

        // cactus.state.data.defaultMix = 0.25;
        // Center the spine object on screen.
        dispatcher.on("SPIN", ()=> {
            logo.state.setAnimation(0, "LOGO", false);
        });
        this.addChild(logo);
    }
}