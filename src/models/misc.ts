import type SkillAtlas from './sprite'

export enum State {
  DEFAULT = 0,
  INTERMEDIATE = 1,
  ACTIVE = 2
}

export interface FrameInfo {
  width: number
  height: number
  innerRadius: number
  skillAtlas: SkillAtlas[]
}
