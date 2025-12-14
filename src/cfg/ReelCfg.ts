export type SymId = "AA" | "BB" | "CC" | "DD" | "EE" | "FF" | "GG" | "HH" | "II" | "SC" | "WD";

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
        landing: "_LAND",
        win: "_WIN",
        idle: "_IDLE"
    };

    static readonly scatterId: SymId = "SC";

    static readonly spineIds = {
        AA: '10',
        BB: 'J',
        CC: 'Q',
        DD: 'K',
        EE: 'A',
        FF: 'VULTURE',
        GG: 'DOG',
        HH: 'SNAKE',
        II: 'TAPIR',
        SC: 'SCATTER',
        WD: 'WILD'
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
