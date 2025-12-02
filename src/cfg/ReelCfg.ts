export type SymId = "AA" | "BB" | "CC" | "DD" | "EE" | "FF" | "GG" | "HH" | "II" | "SC";

export type SingleFreeSpinResult = {
    screen: string[][];
    cluster: any[],
    tumbles: any[],
    spinCount: number;
    multiplierGrid: number[][];
    reTrigger: boolean
    reTriggerSpins?: number
    spinTotalWin: number
};


export class ReelCfg {
    static readonly animType = {
        landing: "land",
        win: " win",
    };

    static readonly scatterId: SymId = "SC";

    static readonly spineIds = {
        AA: '10',
        BB: 'J',
        CC: 'Q',
        DD: 'K',
        EE: 'A',
        FF: 'vulture',
        GG: 'dog',
        HH: 'snake',
        II: 'tapir'
    };

    public static get symIds() {
        return {
            TEN: ReelCfg.spineIds.AA,
            J: ReelCfg.spineIds.BB,
            Q: ReelCfg.spineIds.CC,
            K: ReelCfg.spineIds.DD,
            A: ReelCfg.spineIds.EE,
            VULTURE: ReelCfg.spineIds.FF,
            DOG: ReelCfg.spineIds.GG,
            SNAKE: ReelCfg.spineIds.HH,
            TAPIR: ReelCfg.spineIds.II,
        };
    }

    private static getSpineId<T extends keyof typeof ReelCfg.spineIds>(key: T): string {
        return ReelCfg.spineIds[key];
    }

    //TODO: get those strings from init data
    static readonly dataTypes = {
        featurePlaceRandomCluster: "featurePlaceRandomCluster",
        featurePlaceRandomClusterFreeGame: "featureGummyGalaxyTriggerFreeGame",
        featureClusterDetect: "featureClusterDetect",
        featureSugarRushScatterCount: "featureGummyGalaxyScatterCount",
        featureSugarRushTumble: "featureGummyGalaxyTumble",
    }
}
