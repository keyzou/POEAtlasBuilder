import { calculateOrbitAngles } from './utils'

/* eslint-disable @typescript-eslint/no-magic-numbers */
export const skillsPerOrbit = [1, 6, 16, 16, 40, 72, 72]
export const orbitAngles = calculateOrbitAngles(skillsPerOrbit)
export const orbitRadii = [0, 82, 162, 335, 493, 662, 846]

export const SKILL_ATLAS_WIDTH = 520
export const SKILL_ATLAS_HEIGHT = 520
export const SKILL_FRAME_WIDTH = 40
export const SKILL_FRAME_HEIGHT = 40
export const SKILL_FRAME_INNER_RADIUS = 28
export const NOTABLE_FRAME_WIDTH = 58
export const NOTABLE_FRAME_HEIGHT = 59
export const NOTABLE_FRAME_INNER_RADIUS = 35

export const ATLAS_TREE_POE_VERSION = 6

export default { skillsPerOrbit, orbitAngles, orbitRadii }
