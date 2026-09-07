export const PUSH_WEIGHT = 10;
export const SHOWCASE_WEIGHT = 15;
export const RECENCY_UNDER_24H = 5;
export const RECENCY_UNDER_72H = 2;

const MS_IN_24H = 24 * 60 * 60 * 1000;
const MS_IN_72H = 72 * 60 * 60 * 1000;

export interface ActivityScoreInput {
  pushes7d: number;
  showcases7d: number;
  lastPushAt?: string | null;
}

export type RankDirection = "up" | "down" | "same";

export interface RankDelta {
  delta: number;
  direction: RankDirection;
}

/**
 * Computes the recency bonus based on the builder's most recent push timestamp.
 * Returns 5 if < 24 hours, 2 if < 72 hours, 0 otherwise.
 */
export function computeRecencyBonus(
  lastPushAt: string | null | undefined,
  referenceDate: Date | number | string = Date.now()
): number {
  if (!lastPushAt) {
    return 0;
  }

  const pushTime = new Date(lastPushAt).getTime();
  if (Number.isNaN(pushTime)) {
    return 0;
  }

  const refTime = new Date(referenceDate).getTime();
  const diffMs = refTime - pushTime;

  // Handle recent pushes (including slight clock drift where diffMs <= 0)
  if (diffMs < MS_IN_24H) {
    return RECENCY_UNDER_24H;
  }

  if (diffMs < MS_IN_72H) {
    return RECENCY_UNDER_72H;
  }

  return 0;
}

/**
 * Computes the aggregate activity score for a builder:
 * pushes7d * 10 + showcases7d * 15 + recencyBonus
 */
export function computeActivityScore(
  input: ActivityScoreInput,
  referenceDate?: Date | number | string
): number {
  const { pushes7d, showcases7d, lastPushAt } = input;
  const recencyBonus = computeRecencyBonus(lastPushAt, referenceDate);

  return pushes7d * PUSH_WEIGHT + showcases7d * SHOWCASE_WEIGHT + recencyBonus;
}

/**
 * Computes the movement of a member's position relative to their previous rank.
 * If previousRank is null (new member), returns delta 0 and direction 'same'.
 */
export function computeRankDelta(
  currentRank: number,
  previousRank: number | null | undefined
): RankDelta {
  if (previousRank === null || previousRank === undefined) {
    return {
      delta: 0,
      direction: "same",
    };
  }

  if (currentRank < previousRank) {
    return {
      delta: previousRank - currentRank,
      direction: "up",
    };
  }

  if (currentRank > previousRank) {
    return {
      delta: currentRank - previousRank,
      direction: "down",
    };
  }

  return {
    delta: 0,
    direction: "same",
  };
}

export interface FormattedDelta {
  indicator: "up" | "down" | "unchanged";
  text: string;
}

export function formatRankDelta(delta: RankDelta): FormattedDelta {
  if (delta.direction === "up") {
    return { indicator: "up", text: `▲ +${delta.delta}` };
  }
  if (delta.direction === "down") {
    return { indicator: "down", text: `▼ -${delta.delta}` };
  }
  return { indicator: "unchanged", text: "–" };
}

export const computeDelta = computeRankDelta;
export type DeltaResult = RankDelta;
