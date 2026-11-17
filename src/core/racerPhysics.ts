export interface RacerCarState {
  x: number;
  speed: number; // m/s
  nos: number; // 0..100
  nosActive: boolean;
  distance: number; // meters
  score: number;
  health: number; // 0..100
  steerVelocity: number;
}

export interface TrafficCarBox {
  x: number;
  z: number;
  halfW: number;
  halfL: number;
}

export const ROAD_HALF_WIDTH = 5.4;
export const CAR_HALF_W = 0.92;
export const CAR_HALF_L = 2.05;

export function createInitialCarState(): RacerCarState {
  return {
    x: 0,
    speed: 34, // ~122 km/h cruising start
    nos: 100,
    nosActive: false,
    distance: 0,
    score: 0,
    health: 100,
    steerVelocity: 0,
  };
}

export function stepPlayerCar(
  state: RacerCarState,
  input: { left: boolean; right: boolean; up: boolean; down: boolean; nos: boolean },
  dt: number,
  turboBonus = false
): RacerCarState {
  const clampedDt = Math.min(dt, 0.05);
  const canNos = input.nos && state.nos > 2;
  const maxSpeed = (canNos ? 96 : 68) * (turboBonus ? 1.12 : 1.0); // m/s (~345 km/h max)
  const minSpeed = 18;

  let speed = state.speed;
  if (canNos) {
    speed += 44 * clampedDt;
  } else if (input.up) {
    speed += 24 * clampedDt;
  } else if (input.down) {
    speed -= 38 * clampedDt;
  } else {
    // Gentle coast toward cruising speed 42 m/s
    speed += (42 - speed) * 0.7 * clampedDt;
  }
  speed = Math.max(minSpeed, Math.min(maxSpeed, speed));

  let nos = state.nos;
  if (canNos) {
    nos = Math.max(0, nos - 26 * clampedDt);
  } else {
    nos = Math.min(100, nos + 7.5 * clampedDt);
  }

  const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const targetSteerVel = steerInput * 10.5;
  const steerVelocity =
    state.steerVelocity + (targetSteerVel - state.steerVelocity) * Math.min(1, 12 * clampedDt);

  let x = state.x + steerVelocity * clampedDt;
  const limit = ROAD_HALF_WIDTH - CAR_HALF_W;
  if (x < -limit) x = -limit;
  if (x > limit) x = limit;

  const deltaDist = speed * clampedDt;
  const distance = state.distance + deltaDist;
  const scoreMultiplier = canNos ? 2.2 : 1.0;
  const score = state.score + deltaDist * 1.4 * scoreMultiplier;

  return {
    ...state,
    x,
    speed,
    nos,
    nosActive: canNos,
    distance,
    score,
    steerVelocity,
  };
}

export function speedToKmh(speedMs: number): number {
  return Math.round(speedMs * 3.6);
}

export function computeGearAndRpm(speedMs: number, nosActive: boolean): { gear: number; rpm: number } {
  const kmh = speedToKmh(speedMs);
  const thresholds = [0, 60, 110, 165, 220, 280, 380];
  let gear = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (kmh >= thresholds[i]) gear = Math.min(6, i + 1);
  }
  const low = thresholds[gear - 1];
  const high = thresholds[gear] || 380;
  const ratio = Math.max(0, Math.min(1, (kmh - low) / Math.max(1, high - low)));
  const rpm = Math.round(2400 + ratio * 6100 + (nosActive ? 450 : 0));
  return { gear, rpm: Math.min(9000, rpm) };
}

export function checkCarCollision(
  playerX: number,
  playerZ: number,
  traffic: TrafficCarBox
): boolean {
  const dx = Math.abs(playerX - traffic.x);
  const dz = Math.abs(playerZ - traffic.z);
  return dx < CAR_HALF_W + traffic.halfW && dz < CAR_HALF_L + traffic.halfL;
}
