import { Container, Graphics, Texture } from "pixi.js";
import gsap from "gsap";
import { SpriteNumberText } from "../utils/SpriteNumberText";
import { dispatcher } from "../index";

export class Wins extends Container{
    private digitTextures:  Record<string, Texture>;
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
    }

    /**
     * Displays a floating total win text on the board with pulsing animation.
     * It is removed when the next spin starts.
     * @param totalWin - The total win amount to display.
     */
    public showTotalWin(totalWin: string): void {

        const text = this.createWinText(totalWin);

        this.animatePopIn(text).then(() => {
            this.animatePulsingText(text);
        });

        const removeHandler = async () => this.removeTotalWin(text);

        dispatcher.once("SPIN", removeHandler);
    }

    /**
     * Creates a BitmapText object for wins with standardized styling.
     * @param text - The text to display (e.g., "$10.00").
     * @param fontSize - The font size for the BitmapText.
     * @param scale - The initial scale for the BitmapText.
     * @returns The newly created BitmapText.
     */
    private createWinText(text: string): Container {
        const winText = new SpriteNumberText({
            digitTextures: this.digitTextures,
            text: text,
            spacing: 2,
            align: "center",
            maxHeight: 350, // optional: auto fit height
        })
        winText.spacingPercent = -70;
        this.addChild(winText);
        return winText;
    }

    /**
     * Animates a BitmapText from very small scale to its current scale for a "pop" effect.
     * @param text - The BitmapText to animate.
     * @returns A Promise resolved when the animation completes.
     */
    private async animatePopIn(text: any): Promise<void> {
        await gsap.from(
            text.scale,
            {
                x: 0,
                y: 0,
                ease: "elastic.out",
                duration: 0.5,
            }
        );
    }

    /**
     * Applies a continuous pulsing effect to a BitmapText (e.g., total-win text).
     * @param text - The BitmapText to pulse.
     */
    private animatePulsingText(text: any): void {
        gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
            .to(text.scale, {
                duration: 0.3,
                x: 1.2,
                y: 1.2,
                ease: "power2.in"
            })
            .to(text.scale, {
                duration: 0.8,
                x: 1,
                y: 1,
                ease: "circ.out"
            });
    }

    /**
     * Finds the Symbol in the middle of a cluster by sorting coordinates and picking the midpoint.
     * If the resulting middle coordinate is at the grid’s edge (0 or 6), we shift it to 1 or 5
     * so that the win text won't go partially off-screen.
     *
     * @param coordinates - The array of [row, col] positions.
     * @returns The "middle" symbol in the cluster or null if none found.
     */
    // private findMiddleSymbol(coordinates: [number, number][]): Symbol | null {
    //     if (coordinates.length === 0) {
    //         return null;
    //     }
    //
    //     // Make a copy and sort by row (first element) then by column.
    //     const sortedCoordinates = coordinates.slice().sort((a, b) => {
    //         if (a[0] !== b[0]) {
    //             return a[0] - b[0];
    //         }
    //         return a[1] - b[1];
    //     });
    //
    //     let midRow: number;
    //     let midCol: number;
    //     const count = sortedCoordinates.length;
    //
    //     // For an odd number, take the middle point directly.
    //     // For an even number, average the two middle coordinates.
    //     if (count % 2 === 1) {
    //         [midRow, midCol] = sortedCoordinates[Math.floor(count / 2)];
    //     } else {
    //         const [row1, col1] = sortedCoordinates[count / 2 - 1];
    //         const [row2, col2] = sortedCoordinates[count / 2];
    //         midRow = Math.round((row1 + row2) / 2);
    //         midCol = Math.round((col1 + col2) / 2);
    //     }
    //
    //     // Return the symbol from the grid if it exists.
    //     // return this.grid[midRow]?.[midCol] || null;
    // }

    private async removeTotalWin(text: any): Promise<void> {
        if (!text || !text.parent) return;

        gsap.killTweensOf(text);

        const scaleRef = text.scale;
        if (!scaleRef) return;

        gsap.killTweensOf(scaleRef);
        await gsap.to(scaleRef, { x: 0, y: 0, duration: 0.3 });

        if (text.parent) {
            text.parent.removeChild(text);
        }
        text.destroy();
    }
}