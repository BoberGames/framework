import gsap from "gsap";
import { Assets, Container, Sprite } from "pixi.js";
import { dispatcher } from "../index";

export class StartScreen extends Container{

    constructor() {
        super();
        const bg = new Sprite(Assets.get("info/info_bg"));

        bg.scale.set(1.2);
        this.addChild(bg);

        const logo = new Sprite(Assets.get("info/Info_logo"));
        this.addChild(logo);
        gsap.from(logo, {y: 500, alpha: 0, duration: 0.8, ease: "elastic.out"});

        this.createCards();
        this.createStartBtn();
    }

    private async createCards() {
        const cardNames = ["wild", "scatter", "maxwin"];
        const cards = [];

        for (let i = 0; i < cardNames.length; i++) {
            const card = new Sprite(Assets.get("info/info_" + cardNames[i]));
            cards.push(card);
            this.addChild(card);
        }
        
        gsap.from(cards, {y: -200, alpha: 0, duration: 0.5, stagger: 0.5});
    }

    private createStartBtn() {
        const btn = new Sprite(Assets.get("info/continue"));

        btn.anchor.set(0.5, 0.5);
        btn.position.set(this.width * 0.5, this.height * 0.3);
        this.addChild(btn);
        this.animatePulsingText(btn);
        btn.interactive = true;
        btn.on("pointerdown", async () => {
            await gsap.to(this, { alpha: 0, duration: 1 });
            this.destroy();
        });
    }

    private animatePulsingText(text: Sprite): void {
        gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
            .to(text.scale, {
                duration: 0.3,
                x: 1.03,
                y: 1.03,
                ease: "power2.in"
            })
            .to(text.scale, {
                duration: 0.8,
                x: 1,
                y: 1,
                ease: "circ.out"
            });
    }
}