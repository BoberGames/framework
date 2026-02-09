import { Container, Texture } from "pixi.js";
import { SpriteNumberText } from "../../utils/SpriteNumberText";

export class BangupComponent extends Container {
    private bangupText: SpriteNumberText;
    private digitTextures: Record<string, Texture>;

    constructor() {
        super();
        this.digitTextures = {
            "0": Texture.from("fonts/gold/gold_0"),
            "1": Texture.from("fonts/gold/gold_1"),
            "2": Texture.from("fonts/gold/gold_2"),
            "9": Texture.from("fonts/gold/gold_9"),
            "3": Texture.from("fonts/gold/gold_3"),
            "4": Texture.from("fonts/gold/gold_4"),
            "5": Texture.from("fonts/gold/gold_5"),
            "6": Texture.from("fonts/gold/gold_6"),
            "7": Texture.from("fonts/gold/gold_7"),
            "8": Texture.from("fonts/gold/gold_8"),
            ".": Texture.from("fonts/gold/gold_dot"),
            ",": Texture.from("fonts/gold/gold_coma"),
        };

        this.bangupText = new SpriteNumberText({
            digitTextures: this.digitTextures,
            align: "center",
            spacing: -200,
            scale: 1.5,
        });
        this.bangupText.position.set(0, -200);
        this.bangupText.spacing = -350;
        this.addChild(this.bangupText);
    }

    public async startBangup(winAmount: number): Promise<void> {
        await this.bangupText.countTo(9999.56, 5000, {
            pulse: true,
            pulseScale: 1.1,
            pulseMs: 500,
            showDecimals: true, // 👈 enables dot glyph
            decimals: 2,
        });

        this.bangupText.startBlinkingEffect({
            everyMs: 2200,     // burst every ~2.2s
            scaleUp: 1.10,     // slightly stronger
            flashTint: 0xffff4b,
            flashMs: 100,
        });
    }
}