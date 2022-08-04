interface SkillAtlas {
  filename: string
  coords: Record<string, { x: number; y: number; w: number; h: number }>
}

export default SkillAtlas
