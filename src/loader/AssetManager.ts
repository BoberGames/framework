import { Assets, AssetsManifest, Texture } from "pixi.js";
import { dispatcher } from "../index";

export class AssetManager {
    public loadedJSON: any;
    private static _instances: any = {};
    private _hasLoaded: boolean = false;
    public static ASSET_TYPE_IMAGE: string = "image";
    public static ASSET_TYPE_JSON: string = "json";
    public static ASSET_TYPE_FONT: string = "font";

    public getProgress() {
        return AssetManager._instances.progress;
    }

    public static get(manifestId: string): AssetManager {
        let assets: AssetManager;

        if (AssetManager._instances[manifestId]) {
            assets = AssetManager._instances[manifestId];
        } else {
            assets = new AssetManager();
            AssetManager._instances[manifestId] = assets;
        }
        return assets;
    }

    public isLoaded(): boolean {
        return this._hasLoaded;
    }
    public getPIXIAsset(id: string): any {
        let res = Assets.get("layout_base")[id]
        return res;
    }

    public getPIXIImage(id: string): any {
        let res = AssetManager._instances.imageListLoad && AssetManager._instances.imageListLoad[id];
        return res;
    }

    public loadManifest = async (manifest: AssetsManifest) => {
        await Assets.init({ manifest: manifest });
    }

    public getPIXITexture(textureId: string): Texture {
        let texture: Texture;

        if (this.getPIXIImage(textureId)) {
            texture = this.getPIXIImage(textureId);
        } else {
            throw "[AssetManager] Texture does not exist in assets (was it filtered by bandwidth?) : " + textureId;
        }

        return texture;
    }

    public async load(manifest: any) {
        const onManifest = async (manifest: any) => {
            AssetManager._instances['imageList'] = []
            for (const item of manifest.items) {
                switch (item.type) {
                    case AssetManager.ASSET_TYPE_IMAGE:
                        {
                            AssetManager._instances['imageList'].push({ alias: item.id, src: item.path })
                            break;
                        }
                    case AssetManager.ASSET_TYPE_JSON:
                        {
                           AssetManager._instances['imageList'].push({ alias: item.id, src: item.path, loader: 'loadJson' })
                            break;
                        }
                    case AssetManager.ASSET_TYPE_FONT:
                        {
                           AssetManager._instances['imageList'].push({ alias: item.id, data:{ family: item.id }, src: item.path })
                            break;
                        }
                }
            }
        }
        await Assets.load({ src: manifest, loader: 'loadJson' }).then(data => {
            onManifest(data)
        })
        await Assets.load(AssetManager._instances['imageList'], (progress) => {
            AssetManager._instances['progress'] = progress;
            dispatcher.emit("progress", progress);
        }).then(data => {
            AssetManager._instances['imageListLoad'] = data;
        })

    }

}
