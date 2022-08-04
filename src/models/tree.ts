import type TreeGroup from './groups'
import type TreeNode from './nodes'
import type SkillAtlas from './sprite'

interface PassiveTree {
  tree: string
  groups: Record<string, TreeGroup>
  nodes: Record<string, Partial<TreeNode>>
  min_x: number
  max_x: number
  min_y: number
  max_y: number
  assets: Record<string, Record<number | string, string>>
  skillSprites: Record<string, SkillAtlas[]>
  points: {
    totalPoints: number
  }
}

export default PassiveTree
