import { Texture } from 'pixi.js';
import { useMemo } from 'react';

export default class TextureManager {
  private static instance: TextureManager;

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  private textures: { [key: string]: Texture } = {};

  public registerTexture(name: string, path: string): void {
    const texture = Texture.from(path);
    this.textures[name] = texture;
  }

  public getTexture(name: string): Texture {
    if (!(name in this.textures)) {
      throw new Error(`Texture ${name} not found`);
    }
    return this.textures[name];
  }
}

const useTextureManager = () => useMemo(() => TextureManager.getInstance(), [TextureManager.getInstance]);

export { useTextureManager };
