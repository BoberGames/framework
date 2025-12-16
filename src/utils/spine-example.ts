import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { dispatcher } from "../index";
import gsap from "gsap";
export async function getSpine(): Promise<Spine> {

    const cactus = Spine.from({
        skeleton: "cactus:data",
        atlas:    "cactus:atlas",
        scale: 0.5,
    });

    cactus.state.data.defaultMix = 0.25;

    return cactus;
}

export function runAnimationMixer(spine: Spine) {
    const baseAnim = "IDLE_1_DAY";
    const randomAnims = ["IDLE_2", "IDLE_3"];

    let running = true;
    let activeEntry: any = null;

    spine.state.setAnimation(0, baseAnim, true);

    async function loop() {
        while (running) {
            // random wait
            const wait = 1500 + Math.random() * 9000;
            await delay(wait);

            if (!running) break;

            const anim = randomAnims[Math.floor(Math.random() * randomAnims.length)];
            activeEntry = spine.state.setAnimation(0, anim, false);

            try {
                await waitForComplete(activeEntry);
            } catch {
                // animation was cancelled
                break;
            }

            if (!running) break;

            spine.state.setAnimation(0, baseAnim, true);
        }
    }

    loop();

    return {
        stop() {
            running = false;

            // stop animation safely
            spine.state.clearTrack(0);
            spine.state.clearListeners();

            // optional: reset pose
            // spine.skeleton.setToSetupPose();
            // spine.update(0);
        },
    };
}


export async function playAnticipation(spine: Spine): Promise<void> {
    const entry = spine.state.setAnimation(0, "ANTICIPATION", false);
    await waitForComplete(entry);
    runAnimationMixer(spine);
}

export async function playWin(spine: Spine): Promise<void> {
    const entry = spine.state.setAnimation(0, "WIN", false);

    // 🔥 emit at 50% of animation duration
    const halfTime = entry.animationEnd * 0.5;

    gsap.delayedCall(halfTime, () => {
        dispatcher.emit("SHOOT");
    });

    await waitForComplete(entry);
    runAnimationMixer(spine);
}


function delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function waitForComplete(entry: any) {
    return new Promise<void>(resolve => {
        entry.listener = { complete: () => resolve() };
    });
}


