import { scaleLinear } from "d3-scale";
const warrior3SpeedsDomain = [1600, 1800, 2000, 2200, 2440];

const vRRange = [40, 43, 46, 48, 52];
const calculateVRFromWeight = scaleLinear(warrior3SpeedsDomain, vRRange);

export function calcWarrior3VR(w: number) {
  return Math.round(calculateVRFromWeight(w));
}

const vRefRange = [49, 55, 60, 63, 65];
const calculateVRefFromWeight = scaleLinear(warrior3SpeedsDomain, vRefRange);

export function calcWarrior3VRef(w: number) {
  return Math.round(calculateVRefFromWeight(w));
}

const vTossRange = [44, 47, 50, 53, 57];
const calculateVTossFromWeight = scaleLinear(warrior3SpeedsDomain, vTossRange);

export function calcWarrior3VToss(w: number) {
  return Math.round(calculateVTossFromWeight(w));
}
