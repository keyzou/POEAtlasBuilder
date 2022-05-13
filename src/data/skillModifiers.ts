import TreeNode from 'models/nodes'

export type Modifiers = Record<string, { value: number; source?: string }>
export type LeagueGroupedModifiers = Record<string, Modifiers>
type ModifierCallback = (
  node: TreeNode,
  modifiers: LeagueGroupedModifiers
) => LeagueGroupedModifiers

export enum GlobalModifiers {
  GRAND_DESIGN1 = 'Your Maps have #% increased Pack Size',
  GRAND_DESIGN2 = '# Small Atlas Passive Skills grant nothing',
  WANDERING_PATH = '# Notable Atlas Passive Skills grant nothing'
}

/**
 * Grand Design:
 *   - Small Atlas Passive Skills grant nothing
 *   - Your Maps have 1% increased Pack Size per Allocated Notable Atlas Passive Skill
 * @param node Node to apply the keystone on
 * @param modifiers Modifiers coming from the node
 * @returns Modifiers coupled with the keystone new modifiers
 */
const applyGrandDesign: ModifierCallback = (node, modifiers) => {
  const updatedMaps: Modifiers = {}
  const updatedMisc: Modifiers = {}
  if (node.isStartPoint) return {}
  if (!node.isNotable && !node.isKeystone) {
    updatedMisc[GlobalModifiers.GRAND_DESIGN2] = {
      value: 1,
      source: 'Grand Design'
    }
    const groupedModifiers: LeagueGroupedModifiers = {
      Misc: {
        ...updatedMisc
      }
    }
    return groupedModifiers
  }
  if (node.name === 'Grand Design') return {}
  updatedMaps[GlobalModifiers.GRAND_DESIGN1] = {
    value: node.isNotable ? 1 : 0,
    source: 'Grand Design'
  }
  return {
    ...modifiers,
    Maps: {
      ...modifiers['Maps'],
      ...updatedMaps
    }
  }
}

/**
 * Wandering Path:
 *   - Notable Atlas Passive Skills grant nothing
 *   - 100% increased effect of Small Atlas Passive Skills
 * @param node Node to apply the keystone on
 * @param modifiers Modifiers coming from the node
 * @returns Modifiers coupled with the keystone new modifiers
 */
const applyWanderingPath: ModifierCallback = (node, modifiers) => {
  if (node.isStartPoint) return {}
  const updatedMisc: Modifiers = {}
  if (node.isNotable) {
    updatedMisc[GlobalModifiers.WANDERING_PATH] = {
      value: 1,
      source: 'Wandering Path'
    }
    const groupedModifiers: LeagueGroupedModifiers = {
      Misc: {
        ...updatedMisc
      }
    }
    return groupedModifiers
  }
  if (node.name === 'Wandering Path') {
    const effectKey = Object.keys(modifiers['Misc'])[1]
    const effectValue = Object.values(modifiers['Misc'])[1]
    const effect: Modifiers = {}
    effect[effectKey] = { ...effectValue, source: 'Wandering Path' }
    return {
      Misc: {
        ...effect
      }
    }
  }
  if (node.isKeystone) return modifiers
  for (const [league, mods] of Object.entries(modifiers)) {
    for (const modName of Object.keys(mods)) {
      if (Object.values<string>(GlobalModifiers).includes(modName)) continue
      modifiers[league][modName].value *= 2
    }
  }
  return modifiers
}

export const GLOBAL_SKILL_MODIFIER_LOOKUP: Record<string, ModifierCallback> = {
  38059: applyGrandDesign,
  40658: applyWanderingPath
}
