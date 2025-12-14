import { Container } from "pixi.js";
import { Spine } from "@esotericsoftware/spine-pixi-v8";

export class LogoView extends Container {
    constructor() {
        super();
        const logo = Spine.from({
            skeleton: "logo:data",
            atlas:    "logo:atlas",
            scale: 0.52,
        });

        // cactus.state.data.defaultMix = 0.25;
        // Center the spine object on screen.
        logo.state.setAnimation(0, "LOGO", true);
        this.addChild(logo);
    }
}