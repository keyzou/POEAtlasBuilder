import passiveBg from 'assets/AtlasPassiveBackground.png'
import atlasStart from 'assets/AtlasPassiveSkillScreenStart.png'
import masteriesAtlas from 'assets/icons/atlases/atlas-groups-3.png'
import masteriesActiveAtlas from 'assets/icons/atlases/atlas-mastery-active-3.png'
import skillsActiveAtlas from 'assets/icons/atlases/atlas-skills-3.jpg'
import skillsAtlas from 'assets/icons/atlases/atlas-skills-disabled-3.jpg'
import notableFrameActive from 'assets/icons/NotableFrameActive.png'
import notableFrameHighlighted from 'assets/icons/NotableFrameIntermediate.png'
import notableFrameUnallocated from 'assets/icons/NotableFrameUnallocated.png'
import orbitBackground1 from 'assets/icons/PSGroupBackground1.png'
import orbitBackground2 from 'assets/icons/PSGroupBackground2.png'
import orbitBackground3 from 'assets/icons/PSGroupBackground3.png'
import skillFrameActive from 'assets/icons/Skill_Frame_Active.png'
import skillFrameHighlighted from 'assets/icons/Skill_Frame_Intermediate.png'
import skillFrameUnallocated from 'assets/icons/Skill_Frame_Unallocated.png'
import { Texture } from 'pixi.js'
import { useMemo } from 'react'

export default class TextureManager {
	private static instance: TextureManager

	public static getInstance(): TextureManager {
		/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
		if (!TextureManager.instance) {
			TextureManager.instance = new TextureManager()
		}
		return TextureManager.instance
	}

	private textures: Record<string, Texture> = {}

	public initialize(): void {
		// ====== Textures registration
		this.registerTexture('skill-frame-unallocated', skillFrameUnallocated)
		this.registerTexture('skill-frame-highlighted', skillFrameHighlighted)
		this.registerTexture('skill-frame-active', skillFrameActive)
		// ==============
		this.registerTexture('skill-notable-unallocated', notableFrameUnallocated)
		this.registerTexture('skill-notable-highlighted', notableFrameHighlighted)
		this.registerTexture('skill-notable-active', notableFrameActive)
		// ==============
		this.registerTexture('group-bg-1', orbitBackground1)
		this.registerTexture('group-bg-2', orbitBackground2)
		this.registerTexture('group-bg-3', orbitBackground3)
		// ==============
		this.registerTexture('masteries', masteriesAtlas)
		this.registerTexture('masteries-active', masteriesActiveAtlas)
		// ==============
		this.registerTexture('skills', skillsAtlas)
		this.registerTexture('skills-active', skillsActiveAtlas)
		// ============================
		this.registerTexture('bg-image', passiveBg)
		this.registerTexture('atlas-start', atlasStart)
	}

	private registerTexture(name: string, path: string): void {
		const texture = Texture.from(path)
		this.textures[name] = texture
	}

	public getTexture(name: string): Texture {
		if (!(name in this.textures)) {
			throw new Error(`Texture ${name} not found`)
		}
		return this.textures[name]
	}
}

const useTextureManager = (): TextureManager =>
	useMemo(() => TextureManager.getInstance(), [])

export { useTextureManager }
