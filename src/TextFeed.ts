import { Container, Text } from "pixi.js";
import gsap from "gsap";

export class TextFeed {
    public container: Container;
    private readonly lineHeight = 50;  // adjust for your font size
    private readonly messages: Text[] = [];

    constructor() {
        this.container = new Container();
    }

    /**
     * Adds a new text line at the bottom and pushes older ones upwards.
     */
    public addMessage(message: string) {
        const newText = new Text(message, {
            fontFamily: "Arial",
            fontSize: 40,
            fill: 0xffffff,
            fontWeight: "bold"
        });

        // Start new text *below* the container
        newText.y = this.messages.length * this.lineHeight;

        this.container.addChild(newText);
        this.messages.push(newText);

        // Animate upward shift
        gsap.to(this.container, {y: this.container.y - newText.height, duration: 0.3})
        this.animateShift();
    }

    /**
     * Moves all messages up to make space for the new message.
     */
    private animateShift() {
        this.messages.forEach((txt, index) => {
            gsap.to(txt, {
                y: index * this.lineHeight - this.lineHeight, // shift up by 1 slot
                duration: 0.3,
                ease: "sine.out"
            });
        });
    }
}
