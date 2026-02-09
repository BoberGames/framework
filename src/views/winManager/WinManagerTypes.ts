import { Texture } from 'pixi.js';

export type WIN_TYPE = 'SMALL' | 'BIG' | 'SUPER' | 'MEGA';

export const WinMaps = {
    BIG: 0,
    SUPER: 1,
    MEGA: 2
}

export interface IBangupComponent {
    useCurrency: boolean,
    bangupFont: string,
    bangupSize: number,
    position: { x: number, y: number },
}

export function getEmitterConfig() {
    return {
        lifetime: {
            max: 0.8,
            min: 0.5
        },
        maxParticles: 500,
        frequency: 0.03,
        addAtBack: true,
        pos: {
            x: 0,
            y: 0
        },
        behaviors: [
            {
                type: 'spawnShape',
                config: {
                    type: 'torus',
                    data: {
                        radius: 800,
                        innerRadius: 200,
                        affectRotation: true
                    }
                }
            },
            {
                type: 'moveSpeed',
                config: {
                    speed: {
                        list: [
                            {
                                time: 0,
                                value: 500
                            },
                            {
                                time: 1,
                                value: 100
                            }
                        ]
                    }
                }
            },
            {
                type: 'scale',
                config: {
                    scale: {
                        list: [
                            {
                                value: 0.3,
                                time: 0
                            },
                            {
                                value: 0.8,
                                time: 1
                            }
                        ]
                    }
                }
            },
            {
                type: 'alpha',
                config: {
                    alpha: {
                        list: [
                            {
                                value: 0,
                                time: 0
                            },
                            {
                                value: 1,
                                time: 0.1
                            },
                            {
                                value: 0,
                                time: 1
                            },
                        ]
                    }
                }
            },
            {
                type: 'animatedSingle',
                config: {
                    anim: {
                        framerate: 12,
                        loop: true,
                        textures: [
                            {
                                texture: Texture.from('coin_1.png'),
                            },
                            {
                                texture: Texture.from('coin_2.png'),
                            },
                            {
                                texture: Texture.from('coin_3.png'),
                            },
                            {
                                texture: Texture.from('coin_4.png'),
                            },
                            {
                                texture: Texture.from('coin_5.png'),
                            },
                            {
                                texture: Texture.from('coin_6.png'),
                            },
                            {
                                texture: Texture.from('coin_7.png'),
                            },
                            {
                                texture: Texture.from('coin_8.png'),
                            },
                            {
                                texture: Texture.from('coin_9.png'),
                            },
                            {
                                texture: Texture.from('coin_10.png'),
                            },
                            {
                                texture: Texture.from('coin_11.png'),
                            },
                        ]
                    }
                }
            },]
    }
}