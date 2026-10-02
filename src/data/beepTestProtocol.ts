import { LevelInfo, ShuttleInfo, VoiceSlotDefinition, VoiceSlotKey } from '../types/beepTest';

// Official 20m Multi-Stage Fitness Test (Beep Test) Leger Protocol
export const BEEP_TEST_LEVELS: LevelInfo[] = [
  { level: 1,  speedKmH: 8.5,  shuttlesCount: 7,  shuttleDurationSeconds: 20 / (8.5 / 3.6),  cumulativeShuttlesStart: 1,   totalDistanceAtEndMeters: 140 },
  { level: 2,  speedKmH: 9.0,  shuttlesCount: 8,  shuttleDurationSeconds: 20 / (9.0 / 3.6),  cumulativeShuttlesStart: 8,   totalDistanceAtEndMeters: 300 },
  { level: 3,  speedKmH: 9.5,  shuttlesCount: 8,  shuttleDurationSeconds: 20 / (9.5 / 3.6),  cumulativeShuttlesStart: 16,  totalDistanceAtEndMeters: 460 },
  { level: 4,  speedKmH: 10.0, shuttlesCount: 9,  shuttleDurationSeconds: 20 / (10.0 / 3.6), cumulativeShuttlesStart: 24,  totalDistanceAtEndMeters: 640 },
  { level: 5,  speedKmH: 10.5, shuttlesCount: 9,  shuttleDurationSeconds: 20 / (10.5 / 3.6), cumulativeShuttlesStart: 33,  totalDistanceAtEndMeters: 820 },
  { level: 6,  speedKmH: 11.0, shuttlesCount: 10, shuttleDurationSeconds: 20 / (11.0 / 3.6), cumulativeShuttlesStart: 42,  totalDistanceAtEndMeters: 1020 },
  { level: 7,  speedKmH: 11.5, shuttlesCount: 10, shuttleDurationSeconds: 20 / (11.5 / 3.6), cumulativeShuttlesStart: 52,  totalDistanceAtEndMeters: 1220 },
  { level: 8,  speedKmH: 12.0, shuttlesCount: 11, shuttleDurationSeconds: 20 / (12.0 / 3.6), cumulativeShuttlesStart: 62,  totalDistanceAtEndMeters: 1440 },
  { level: 9,  speedKmH: 12.5, shuttlesCount: 11, shuttleDurationSeconds: 20 / (12.5 / 3.6), cumulativeShuttlesStart: 73,  totalDistanceAtEndMeters: 1660 },
  { level: 10, speedKmH: 13.0, shuttlesCount: 11, shuttleDurationSeconds: 20 / (13.0 / 3.6), cumulativeShuttlesStart: 84,  totalDistanceAtEndMeters: 1880 },
  { level: 11, speedKmH: 13.5, shuttlesCount: 12, shuttleDurationSeconds: 20 / (13.5 / 3.6), cumulativeShuttlesStart: 95,  totalDistanceAtEndMeters: 2120 },
  { level: 12, speedKmH: 14.0, shuttlesCount: 12, shuttleDurationSeconds: 20 / (14.0 / 3.6), cumulativeShuttlesStart: 107, totalDistanceAtEndMeters: 2360 },
  { level: 13, speedKmH: 14.5, shuttlesCount: 13, shuttleDurationSeconds: 20 / (14.5 / 3.6), cumulativeShuttlesStart: 119, totalDistanceAtEndMeters: 2620 },
  { level: 14, speedKmH: 15.0, shuttlesCount: 13, shuttleDurationSeconds: 20 / (15.0 / 3.6), cumulativeShuttlesStart: 132, totalDistanceAtEndMeters: 2880 },
  { level: 15, speedKmH: 15.5, shuttlesCount: 13, shuttleDurationSeconds: 20 / (15.5 / 3.6), cumulativeShuttlesStart: 145, totalDistanceAtEndMeters: 3140 },
  { level: 16, speedKmH: 16.0, shuttlesCount: 14, shuttleDurationSeconds: 20 / (16.0 / 3.6), cumulativeShuttlesStart: 158, totalDistanceAtEndMeters: 3420 },
  { level: 17, speedKmH: 16.5, shuttlesCount: 14, shuttleDurationSeconds: 20 / (16.5 / 3.6), cumulativeShuttlesStart: 172, totalDistanceAtEndMeters: 3700 },
  { level: 18, speedKmH: 17.0, shuttlesCount: 15, shuttleDurationSeconds: 20 / (17.0 / 3.6), cumulativeShuttlesStart: 186, totalDistanceAtEndMeters: 4000 },
  { level: 19, speedKmH: 17.5, shuttlesCount: 15, shuttleDurationSeconds: 20 / (17.5 / 3.6), cumulativeShuttlesStart: 201, totalDistanceAtEndMeters: 4300 },
  { level: 20, speedKmH: 18.0, shuttlesCount: 16, shuttleDurationSeconds: 20 / (18.0 / 3.6), cumulativeShuttlesStart: 216, totalDistanceAtEndMeters: 4620 },
  { level: 21, speedKmH: 18.5, shuttlesCount: 16, shuttleDurationSeconds: 20 / (18.5 / 3.6), cumulativeShuttlesStart: 232, totalDistanceAtEndMeters: 4940 },
];

// Helper to compute VO2 max from stage/shuttle
export function calculateVO2Max(level: number, shuttle: number): number {
  const lvlInfo = BEEP_TEST_LEVELS.find((l) => l.level === level) || BEEP_TEST_LEVELS[0];
  const maxShuttles = lvlInfo.shuttlesCount;
  // Leger et al. standard regression: VO2 max (ml/kg/min) = 3.46 * (level + shuttle/maxShuttles) + 12.2
  const score = level + (shuttle / maxShuttles);
  const vo2 = 3.46 * score + 12.2;
  return Math.round(vo2 * 10) / 10;
}

// Generate all 247 shuttles
export function generateAllShuttles(): ShuttleInfo[] {
  const shuttles: ShuttleInfo[] = [];
  let totalIdx = 1;
  let cumDistance = 0;
  let cumTime = 13; // starts at approx 13s (intro + ready + triple beep)

  for (const lvl of BEEP_TEST_LEVELS) {
    for (let s = 1; s <= lvl.shuttlesCount; s++) {
      const isStart = s === 1;
      const cue = isStart
        ? `Start level ${lvl.level} 1`
        : `Level ${lvl.level} ${s}`;

      cumDistance += 20;

      shuttles.push({
        level: lvl.level,
        shuttle: s,
        totalShuttleIndex: totalIdx++,
        speedKmH: lvl.speedKmH,
        durationSeconds: lvl.shuttleDurationSeconds,
        cumulativeDistanceMeters: cumDistance,
        cumulativeTimeSeconds: cumTime,
        cueText: cue,
        isLevelStart: isStart,
        estimatedVO2Max: calculateVO2Max(lvl.level, s),
      });

      cumTime += lvl.shuttleDurationSeconds;
    }
  }

  return shuttles;
}

export const ALL_SHUTTLES = generateAllShuttles();

export const VOICE_SLOT_DEFINITIONS: VoiceSlotDefinition[] = [
  {
    key: 'intro',
    label: 'Intro Announcement',
    phrase: 'The multi-stage fitness test will start in 5 seconds.',
    category: 'core',
    guideTip: 'Say clearly and steadily at normal speaking volume.',
  },
  {
    key: 'ready',
    label: 'Ready Command',
    phrase: 'Ready.',
    category: 'core',
    guideTip: 'Crisp, focused call right before the triple beep.',
  },
  {
    key: 'start_level',
    label: 'Start Level Prefix',
    phrase: 'Start level',
    category: 'core',
    guideTip: 'Used at the beginning of each new stage (e.g., "Start level 1 1").',
  },
  {
    key: 'level',
    label: 'Level Word',
    phrase: 'Level',
    category: 'core',
    guideTip: 'Used for intermediate shuttles (e.g., "Level 1 2").',
  },
  ...Array.from({ length: 21 }, (_, i) => ({
    key: `num_${i + 1}` as VoiceSlotKey,
    label: `Number ${i + 1}`,
    phrase: `${i + 1}`,
    category: 'number' as const,
    guideTip: `Say "${i + 1}" clearly and punchy.`,
  })),
  {
    key: 'outro',
    label: 'Finish Outro',
    phrase: 'That is the end of the final level.',
    category: 'outro',
    guideTip: 'Celebratory or authoritative closing announcement.',
  },
];
