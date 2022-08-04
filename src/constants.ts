import type { FrameInfo } from 'models/misc'
import type TreeNode from 'models/nodes'
import type PassiveTree from 'models/tree'
import { calculateOrbitAngles } from './utils'

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
export const KEYSTONE_FRAME_WIDTH = 84
export const KEYSTONE_FRAME_HEIGHT = 85
export const KEYSTONE_FRAME_INNER_RADIUS = 57

export const TOOLTIP_HEADER_HEIGHT = 88

export const ATLAS_TREE_POE_VERSION = 6

// TODO: Move this away without causing a dependency cycle
export function getNodeFrameInfo(
  node: TreeNode,
  jsonTree: PassiveTree
): FrameInfo {
  if (node.isNotable)
    return {
      width: NOTABLE_FRAME_WIDTH,
      height: NOTABLE_FRAME_HEIGHT,
      innerRadius: NOTABLE_FRAME_INNER_RADIUS,
      skillAtlas: jsonTree.skillSprites.notableInactive
    }

  if (node.isKeystone)
    return {
      width: KEYSTONE_FRAME_WIDTH,
      height: KEYSTONE_FRAME_HEIGHT,
      innerRadius: KEYSTONE_FRAME_INNER_RADIUS,
      // TODO: UPDATE THIS
      skillAtlas: jsonTree.skillSprites.keystoneInactive
    }
  return {
    width: SKILL_FRAME_WIDTH,
    height: SKILL_FRAME_HEIGHT,
    innerRadius: SKILL_FRAME_INNER_RADIUS,
    skillAtlas: jsonTree.skillSprites.normalInactive
  }
}

export const ATLAS_HTML_SELECTOR = '#atlas'

export const leagueToIconsLookup = {
  Abyss: [
    'AbyssNode1',
    'AbyssNotable',
    'AbyssNotable2',
    'AbyssNotable3',
    'AbyssNotable5',
    'AbyssNotable6',
    'WheelofDisablingAbyss'
  ],
  Incursion: [
    'AlvaNode2',
    'AlvaNotable2',
    'AlvaNotable3',
    'AlvaNotable4',
    'AlvaNode',
    'VaalNotable2',
    'VaalNotable1'
  ],
  Anarchy: [
    'Anarchy4',
    'Anarchy5',
    'AnarchyNotable1',
    'AnarchyNotable2',
    'AnarchyNode1'
  ],
  Ascendancy: ['Ascendancy', 'AscendancyNode'],
  Bestiary: [
    'BestiaryNotable1',
    'BestiaryNotable2',
    'BestiaryNotable3',
    'BestiaryNotable4',
    'BestiaryNotable5',
    'Bestiarybosses1',
    'Bestiarybosses2',
    'Bestiarybosses3',
    'Bestiarybosses4',
    'BestiaryNode1'
  ],
  Beyond: ['BeyondNotable2', 'BeyondNotable3', 'BeyondNotable5', 'BeyondNode1'],
  Blight: [
    'BlightInjectorNotable',
    'BlightNode1',
    'BlightNotable1',
    'BlightNotable2',
    'BlightNotable3',
    'BlightNotable4',
    'BlightNotable5',
    'BlightNotable6',
    'WheelofDisablingBlight'
  ],
  Breach: [
    'BreachNode2',
    'BreachNotable2',
    'BreachNotable3',
    'BreachNotable4',
    'BreachNotable5',
    'BreachNotable6',
    'WheelofDisablingBreach'
  ],
  Conqueror: [
    'ConquerorNotable1',
    'ConquerorNotable3',
    'ConquerorNode1',
    'SirusKeystone'
  ],
  Delirium: [
    'DeliriumNotable1',
    'DeliriumNotable2',
    'DeliriumNotable3',
    'DeliriumNotable4',
    'DeliriumNotable5',
    'DeliriumNotable6',
    'DeliriumNode1',
    'WheelofDisablingDelirium'
  ],
  Delve: [
    'DelveNotable1',
    'DelveNotable2',
    'DelveNotable3',
    'DelveNotable4',
    'DelveNotable6',
    'DelveNode',
    'DelveNode2'
  ],
  'Elder/Shaper': [
    'ElderShaperNotable1',
    'ElderShaperNotable2',
    'ElderShaperNotable3',
    'ElderShaperNode1',
    'ShaperAndElderKeystone'
  ],
  Essence: [
    'EssenceNode2',
    'EssenceNotable1',
    'EssenceNotable2',
    'EssenceNotable3'
  ],
  Expedition: [
    'ExpeditionNode1',
    'ExpeditionNotable1',
    'ExpeditionNotable2',
    'ExpeditionNotable3',
    'WheelofDisablingExpedition'
  ],
  Domination: ['GreedShrinenoteble', 'Shrines', 'ShrinesNode'],
  Harbinger: ['HarbingerNode1', 'HarbingerNotable1', 'HarbingerNotable3'],
  Harvest: [
    'HarvestNode',
    'HarvestNotable1',
    'HarvestNotable2',
    'HarvestNotable3',
    'HarvestNotable6',
    'WheelofDisablingHarvest'
  ],
  Heist: [
    'HeistNotable1',
    'HeistNotable2',
    'HeistRobot',
    'HeistNode1',
    'WheelofDisablingHeist'
  ],
  Betrayal: [
    'JunNode1',
    'JunNode2',
    'JunNotable1',
    'JunNotable2',
    'JunNotable4',
    'JunNotable5',
    'JunNotable6'
  ],
  Kirac: [
    'KiracNode',
    'KiracNotable1',
    'KiracNotable2',
    'KiracNotable3',
    'KiracNotable4'
  ],
  Legion: [
    'LegionNotable1',
    'LegionNotable2',
    'LegionNotable3',
    'LegionNotable4',
    'LegionNotable5',
    'LegionNotable6',
    'LegionNode1',
    'WheelofDisablingLegion'
  ],
  Maps: [
    'UniqueMaps',
    'Mapnode',
    'ItemQuantity',
    'ItemQuantityandRarity',
    'ModifierTier',
    'UniqueMapsNode',
    'BossMapDrops',
    'Mapnotable1',
    'Mapnotable2',
    'Mapnotable3',
    'Mapnotable4',
    'MapDuplication',
    'ShadowShaping',
    'DanceofDestructKeystone',
    'TwistOfFateKeystone',
    'SingularFocusKeystone',
    'StreamOfConsciousnessKeystone',
    'WellspringofCreationKeystone'
  ],
  Misc: [
    'WanderingPathKeystone',
    'EldritchGazeKeystone',
    'GrandDesignKeystone',
    'UnspeakableHorrorKeystone',
    'WrathOfTheCosmosKeystone'
  ],
  'Map Bosses': ['MapBossnode', 'MapBossnotable1', 'MapBossnotable2'],
  Rare: ['RareMonstersnode', 'RareMonstersnotable', 'ValleyofDarkness'],
  Metamorph: [
    'MetamorphNode1',
    'MetamorphNotable1',
    'MetamorphNotable2',
    'MetamorphNotable3',
    'MetamorphNotable4',
    'MetamorphNotable6',
    'WheelofDisablingMetamorph'
  ],
  Ritual: [
    'Ritual',
    'RitualNode1',
    'RitualNotable1',
    'RitualNotable2',
    'WheelofDisablingRitual'
  ],
  Scarabs: ['ScarabNotable1', 'ScarabNode1'],
  Sextants: ['Sextantnotable1', 'Sextantnode1'],
  Ambush: [
    'StrongboxNode1',
    'StrongboxCelestial',
    'StrongboxCurrency',
    'StrongboxDiviner',
    'StrongboxNotable1',
    'StrongboxNotable2',
    'StrongboxScarab'
  ],
  Synthesis: [
    'SynthesisNotable1',
    'SynthesisNotable2',
    'SynthesisNotable3',
    'SynthesisNode1',
    'CortexKeystone'
  ],
  'The Searing Exarch': [
    'TheCleansingFireNode',
    'TheCleansingFire1',
    'TheCleansingFire2',
    'TheCleansingFire3',
    'TheCleansingFire4',
    'SearingExarchKeystone'
  ],
  'The Maven': [
    'TheMaven1',
    'TheMaven2',
    'TheMavenNode',
    'UberMavenKeystone',
    'CaptivatedInterestKeystone'
  ],
  'The Eater of Worlds': [
    'TheTangle1',
    'TheTangle2',
    'TheTangle3',
    'TheTangle4',
    'TheTangleNode',
    'EaterOfWorldsKeystone'
  ],
  Torment: ['TormentNode1', 'TormentNotable1'],
  Vaal: ['Vaalsideareas', 'VaalsideareasNode']
}
