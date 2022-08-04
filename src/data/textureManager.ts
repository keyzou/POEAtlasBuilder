import { Application } from '@pixi/app'
import { Resource, Texture } from '@pixi/core'
import { Assets } from '@pixi/assets'
import passiveBg from 'assets/AtlasPassiveBackground.png'
import atlasStart from 'assets/AtlasPassiveSkillScreenStart.png'
import masteriesAtlas from 'assets/icons/atlases/atlas-groups-3.png'
import masteriesActiveAtlas from 'assets/icons/atlases/atlas-mastery-active-3.png'
import skillsActiveAtlas from 'assets/icons/atlases/atlas-skills-3.jpg'
import skillsAtlas from 'assets/icons/atlases/atlas-skills-disabled-3.jpg'
import keystoneFrameActive from 'assets/icons/KeystoneFrameActive.png'
import keystoneFrameHighlighted from 'assets/icons/KeystoneFrameIntermediate.png'
import keystoneFrameUnallocated from 'assets/icons/KeystoneFrameUnallocated.png'
import masteriesActiveBg from 'assets/icons/MasteryActiveBg.png'
import notableFrameActive from 'assets/icons/NotableFrameActive.png'
import notableFrameHighlighted from 'assets/icons/NotableFrameIntermediate.png'
import notableFrameUnallocated from 'assets/icons/NotableFrameUnallocated.png'
import orbitBackground1 from 'assets/icons/PSGroupBackground1.png'
import orbitBackground2 from 'assets/icons/PSGroupBackground2.png'
import orbitBackground3 from 'assets/icons/PSGroupBackground3.png'
import eaterOrbitBackground from 'assets/icons/PSGroupBackground4-Eater.png'
import exarchOrbitBackground from 'assets/icons/PSGroupBackground4-Exarch.png'
import skillFrameActive from 'assets/icons/Skill_Frame_Active.png'
import skillFrameHighlighted from 'assets/icons/Skill_Frame_Intermediate.png'
import skillFrameUnallocated from 'assets/icons/Skill_Frame_Unallocated.png'
import tooltipHeaderEndNotable from 'assets/tooltip-header-end-notable.png'
import tooltipHeaderEnd from 'assets/tooltip-header-end.png'
import tooltipHeaderStartNotable from 'assets/tooltip-header-start-notable.png'
import tooltipHeaderStart from 'assets/tooltip-header-start.png'
import tooltipHeaderPatternNotable from 'assets/tooltip-pattern-notable.jpg'
import tooltipHeaderPattern from 'assets/tooltip-pattern.png'
import { useMemo } from 'react'

export default class TextureManager {
  private static instance: TextureManager
  private _app: Application

  public static getInstance(): TextureManager {
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager()
    }
    return TextureManager.instance
  }

  public ready: boolean = false

  private _texturePromises: Promise<any>[]

  public async initialize(app: Application): Promise<void> {
    this._app = app
    this._texturePromises = []
    // ====== Textures registration
    this.registerTexture('skill-frame-unallocated', skillFrameUnallocated)
    this.registerTexture('skill-frame-highlighted', skillFrameHighlighted)
    this.registerTexture('skill-frame-active', skillFrameActive)
    // ==============
    this.registerTexture('skill-notable-unallocated', notableFrameUnallocated)
    this.registerTexture('skill-notable-highlighted', notableFrameHighlighted)
    this.registerTexture('skill-notable-active', notableFrameActive)
    // ==============
    this.registerTexture('skill-keystone-unallocated', keystoneFrameUnallocated)
    this.registerTexture('skill-keystone-highlighted', keystoneFrameHighlighted)
    this.registerTexture('skill-keystone-active', keystoneFrameActive)
    // ==============
    this.registerTexture('group-bg-1', orbitBackground1)
    this.registerTexture('group-bg-2', orbitBackground2)
    this.registerTexture('group-bg-3', orbitBackground3)
    // ==============
    this.registerTexture('group-bg-exarch', exarchOrbitBackground)
    this.registerTexture('group-bg-eater', eaterOrbitBackground)
    // ==============
    this.registerTexture('masteries', masteriesAtlas)
    this.registerTexture('masteries-active', masteriesActiveAtlas)
    this.registerTexture('masteries-active-bg', masteriesActiveBg)
    // ==============
    this.registerTexture('skills', skillsAtlas)
    this.registerTexture('skills-active', skillsActiveAtlas)
    // ============================
    this.registerTexture('bg-image', passiveBg)
    this.registerTexture('atlas-start', atlasStart)
    // ============================
    this.registerTexture('tooltip-header-start', tooltipHeaderStart)
    this.registerTexture('tooltip-header-end', tooltipHeaderEnd)
    this.registerTexture(
      'tooltip-header-start-notable',
      tooltipHeaderStartNotable
    )
    this.registerTexture('tooltip-header-end-notable', tooltipHeaderEndNotable)
    this.registerTexture('tooltip-header-pattern', tooltipHeaderPattern)
    this.registerTexture(
      'tooltip-header-pattern-notable',
      tooltipHeaderPatternNotable
    )

    console.log(passiveBg, tooltipHeaderPattern)

    await Promise.all(this._texturePromises)

    this.ready = true
  }

  private registerTexture(name: string, path: string): void {
    Assets.add(name, path)
    this._texturePromises.push(Assets.load<Texture>(name))
  }

  public getTexture(name: string): Texture<Resource> {
    return Assets.get(name) as Texture<Resource>
  }
}

const useTextureManager = (): TextureManager =>
  useMemo(() => TextureManager.getInstance(), [])

export { useTextureManager }
