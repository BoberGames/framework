import { Spine } from "@esotericsoftware/spine-pixi-v8";

export async function getSpine(): Promise<Spine> {

    const cactus = Spine.from({
        skeleton: "cactus:data",
        atlas:    "cactus:atlas",
        scale: 0.5,
    });

    cactus.state.data.defaultMix = 0.25;
    // Center the spine object on screen.
    cactus.state.setAnimation(0, "idle 1", true);
    runAnimationMixer(cactus);
    return cactus;
}

function runAnimationMixer(spine: Spine) {
    const baseAnim = "idle 1"; // looping
    const randomAnims = ["idle 2", "idle 3"];

    // start the loop
    spine.state.setAnimation(0, baseAnim, true);

    async function loop() {
        while (true) {
            // random wait
            const wait = 1500 + Math.random() * 9000;
            await delay(wait);

            // pick animation
            const anim = randomAnims[Math.floor(Math.random() * randomAnims.length)];

            // 🔥 play it ON SAME TRACK (0)
            const entry = spine.state.setAnimation(0, anim, false);

            // wait for it
            await waitForComplete(entry);

            // 🔥 smoothly return to baseAnim
            spine.state.setAnimation(0, baseAnim, true);
        }
    }

    loop();
}



function delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function waitForComplete(entry: any) {
    return new Promise<void>(resolve => {
        entry.listener = { complete: () => resolve() };
    });
}


