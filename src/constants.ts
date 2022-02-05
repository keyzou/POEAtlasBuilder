/**
 * Adapted from PathOfBuilding
 * https://github.com/PathOfBuildingCommunity/PathOfBuilding/blob/b8efa6a40ec2db702009c0e7a1d8abed8b0c0346/src/Classes/PassiveTree.lua#L36
 * @param skillsPerOrbit
 */
export function calculateOrbitAngles(skillsPerOrbit: number[]) {
  const orbitAngles: { [key: number]: number[] } = {};
  for (let orbitIndex = 0; orbitIndex < skillsPerOrbit.length; orbitIndex += 1) {
    const skillsInOrbit = skillsPerOrbit[orbitIndex];
    if (skillsInOrbit === 16) {
      orbitAngles[orbitIndex] = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    } else if (skillsInOrbit === 40) {
      orbitAngles[orbitIndex] = [
        0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220,
        225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350
      ];
    } else {
      orbitAngles[orbitIndex] = [];
      for (let i = 0; i < skillsInOrbit; i += 1) {
        orbitAngles[orbitIndex][i] = (360 * i) / skillsInOrbit;
      }
    }
  }

  return orbitAngles;
}
export const skillsPerOrbit = [1, 6, 16, 16, 40, 72, 72];
export const orbitAngles = calculateOrbitAngles(skillsPerOrbit);
export const orbitRadii = [0, 82, 162, 335, 493, 662, 846];

export const SKILL_ATLAS_WIDTH = 520;
export const SKILL_ATLAS_HEIGHT = 520;
export const SKILL_FRAME_WIDTH = 40;
export const SKILL_FRAME_HEIGHT = 40;
export const SKILL_FRAME_INNER_RADIUS = 28;
export const NOTABLE_FRAME_WIDTH = 58;
export const NOTABLE_FRAME_HEIGHT = 59;
export const NOTABLE_FRAME_INNER_RADIUS = 35;

export default { skillsPerOrbit, orbitAngles, orbitRadii, calculateOrbitAngles };
