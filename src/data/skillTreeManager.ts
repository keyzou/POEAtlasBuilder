import type TreeNode from 'models/nodes'
import type { NodeContainer } from 'models/nodes'
import { useMemo } from 'react'
import {
  base64URLEncode,
  setFromPath,
  UInt16ToBytes,
  UInt32ToBytes,
  updateObject
} from 'utils'

class SkillTreeManager {
  private readonly nodes: NodeContainer
  public name?: string = undefined
  public path: string[] = []
  public initialAllocated: number[] = []

  public constructor(nodes: NodeContainer) {
    this.nodes = nodes
    this.initialAllocated = [29045]
  }

  public findNode(predicate: (x: TreeNode) => unknown): TreeNode | undefined {
    return this.toArray().find(element => predicate(element))
  }

  public anyNode(predicate: (x: TreeNode) => unknown): boolean {
    return this.toArray().some(element => predicate(element))
  }

  public getNodes(): NodeContainer {
    return this.nodes
  }

  public filterNodes(predicate: (x: TreeNode) => unknown): TreeNode[] {
    return this.toArray().filter(element => predicate(element))
  }

  public toArray(): TreeNode[] {
    return Object.values(this.nodes)
  }

  public getNode(skill: number): TreeNode {
    if (!(skill in this.nodes)) throw new Error(`Skill not found: ${skill}`)
    return this.nodes[skill]
  }

  public setNode(node: TreeNode): void {
    if (!(node.skill in this.nodes)) throw new Error('Skill not found !')
    this.nodes[node.skill] = node
  }

  public updateNode(skill: number, updated: Partial<TreeNode>): void {
    if (!(skill in this.nodes)) throw new Error('Skill not found !')
    this.nodes[skill] = updateObject(this.nodes[skill], updated)
  }

  public allocateSkill(skill: number): void {
    if (!(skill in this.nodes)) throw new Error('Skill not found !')
    this.nodes[skill].allocated = 1
  }

  public unallocateSkill(skill: number): void {
    if (!(skill in this.nodes)) throw new Error('Skill not found !')
    this.nodes[skill].allocated = 0
  }

  public getAllocatedSkills(): number[] {
    return Object.values(this.nodes)
      .filter(x => x.allocated === 1)
      .map(x => x.skill)
  }

  public setAllocatedSkills(skills: number[]) {
    for (const node of this.toArray()) {
      this.nodes[node.skill].allocated = 0
    }
    for (const skill in skills) {
      this.nodes[skill].allocated = 1
    }
  }

  public saveCurrentTree(): void {
    if (!this.name) return
    let savesStr = localStorage.getItem('saved-trees')
    if (!savesStr) savesStr = '{}'
    const saves = JSON.parse(savesStr)
    setFromPath(saves, [...this.path, this.name], this.getAllocatedSkills())
    localStorage.setItem('saved-trees', JSON.stringify(saves))
    this.initialAllocated = this.getAllocatedSkills()
  }

  public isDirty(): boolean {
    const initial = this.initialAllocated
    const updated = this.getAllocatedSkills()
    return (
      initial.length !== updated.length ||
      !initial.every((value, index) => value === updated[index])
    )
  }

  public exportTree(): string {
    if (this.getAllocatedSkills().length === 0) return ''
    const concatedNodes = []

    for (const bytes of this.getAllocatedSkills()
      .filter(x => x !== 29_045)
      .sort((a, b) => a - b)
      .map(x => UInt16ToBytes(x))) {
      concatedNodes.push(...bytes)
    }
    // eslint-disable-next-line no-bitwise
    const concated = [
      ...UInt32ToBytes(6),
      0,
      0,
      this.getAllocatedSkills().length - 1,
      ...concatedNodes,
      0,
      0
    ]
    return base64URLEncode(concated)
  }
}

export const useSkillTreeManager = (
  baseNodes: NodeContainer
): SkillTreeManager => {
  const instance = useMemo(() => new SkillTreeManager(baseNodes), [baseNodes])
  return instance
}

export interface SkillTreeDirectory {
  [name: string]: this | number[]
}

export default SkillTreeManager
