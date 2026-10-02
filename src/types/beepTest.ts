export interface ShuttleInfo {
  level: number;
  shuttle: number;
  totalShuttleIndex: number; // 1 to 247
  speedKmH: number;
  durationSeconds: number; // time for this shuttle (e.g. 8.47s for level 1)
  cumulativeDistanceMeters: number;
  cumulativeTimeSeconds: number;
  cueText: string; // e.g. "Start level 1 1" or "Level 1 2"
  isLevelStart: boolean;
  estimatedVO2Max: number;
}

export interface LevelInfo {
  level: number;
  speedKmH: number;
  shuttlesCount: number;
  shuttleDurationSeconds: number;
  cumulativeShuttlesStart: number;
  totalDistanceAtEndMeters: number;
}

export type VoiceSlotKey =
  | 'intro'
  | 'ready'
  | 'start_level'
  | 'level'
  | 'num_1'
  | 'num_2'
  | 'num_3'
  | 'num_4'
  | 'num_5'
  | 'num_6'
  | 'num_7'
  | 'num_8'
  | 'num_9'
  | 'num_10'
  | 'num_11'
  | 'num_12'
  | 'num_13'
  | 'num_14'
  | 'num_15'
  | 'num_16'
  | 'num_17'
  | 'num_18'
  | 'num_19'
  | 'num_20'
  | 'num_21'
  | 'outro';

export interface VoiceSlotDefinition {
  key: VoiceSlotKey;
  label: string;
  phrase: string;
  category: 'core' | 'number' | 'outro';
  guideTip?: string;
}

export interface VoiceBank {
  slots: Partial<Record<VoiceSlotKey, string>>; // base64 data URL (audio/webm or audio/wav)
  sampleRate?: number;
  userName?: string;
  voicePitchHz?: number;
  pitchShiftSemitones?: number;
}

export interface AudioSettings {
  beepType: 'classic' | 'digital' | 'whistle' | 'chime';
  beepVolume: number; // 0 to 1
  voiceVolume: number; // 0 to 1
  voiceTiming: 'before_beep' | 'after_beep'; // default is 'after_beep' like original
  beepPitch: number; // default 1800 Hz
  speechSynthesisFallback: boolean;
}
