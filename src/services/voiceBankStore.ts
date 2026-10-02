import { AudioSettings, VoiceBank, VoiceSlotKey } from '../types/beepTest';
import { VOICE_SLOT_DEFINITIONS } from '../data/beepTestProtocol';
import { audioBufferToWav, getAudioContext } from './audioEngine';

const STORAGE_KEY = 'beeptest_voice_bank_v1';
const SETTINGS_KEY = 'beeptest_audio_settings_v1';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  beepType: 'classic',
  beepVolume: 0.9,
  voiceVolume: 0.95,
  voiceTiming: 'after_beep',
  beepPitch: 1800,
  speechSynthesisFallback: true,
};

export const INITIAL_VOICE_BANK: VoiceBank = {
  slots: {},
  userName: 'My Voice',
  voicePitchHz: 145,
  pitchShiftSemitones: 0,
};

// Load saved voice bank
export function loadSavedVoiceBank(): VoiceBank {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_VOICE_BANK, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load voice bank from localStorage', err);
  }
  return INITIAL_VOICE_BANK;
}

// Save voice bank
export function saveVoiceBank(bank: VoiceBank): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  } catch (err) {
    console.warn('Failed to save voice bank to localStorage', err);
  }
}

// Load audio settings
export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load audio settings', e);
  }
  return DEFAULT_AUDIO_SETTINGS;
}

// Save audio settings
export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save audio settings', e);
  }
}

// Calculate completion statistics
export function getVoiceBankStats(bank: VoiceBank): {
  recordedCount: number;
  totalCount: number;
  percentage: number;
  hasCore: boolean;
  missingSlots: VoiceSlotKey[];
} {
  const totalCount = VOICE_SLOT_DEFINITIONS.length;
  let recordedCount = 0;
  const missingSlots: VoiceSlotKey[] = [];

  for (const def of VOICE_SLOT_DEFINITIONS) {
    if (bank.slots[def.key]) {
      recordedCount++;
    } else {
      missingSlots.push(def.key);
    }
  }

  const hasCore =
    !!bank.slots.intro &&
    !!bank.slots.ready &&
    !!bank.slots.start_level &&
    !!bank.slots.level &&
    !!bank.slots.num_1;

  return {
    recordedCount,
    totalCount,
    percentage: Math.round((recordedCount / totalCount) * 100),
    hasCore,
    missingSlots,
  };
}

// Trim leading and trailing silence from an AudioBuffer
export function trimAudioBufferSilence(buffer: AudioBuffer, threshold = 0.015): AudioBuffer {
  const pcm = buffer.getChannelData(0);
  let start = 0;
  let end = pcm.length - 1;

  while (start < pcm.length && Math.abs(pcm[start]) < threshold) {
    start++;
  }

  while (end > start && Math.abs(pcm[end]) < threshold) {
    end--;
  }

  // Safety margin: keep 30ms before and after if possible
  const sampleRate = buffer.sampleRate;
  const padding = Math.floor(sampleRate * 0.03);
  start = Math.max(0, start - padding);
  end = Math.min(pcm.length - 1, end + padding);

  const length = Math.max(1, end - start + 1);
  const audioContext = getAudioContext();
  const trimmed = audioContext.createBuffer(buffer.numberOfChannels, length, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channelData = buffer.getChannelData(c).subarray(start, end + 1);
    trimmed.copyToChannel(channelData, c);
  }

  return trimmed;
}

// Convert AudioBuffer to Base64 Data URL (WAV format)
export function bufferToDataUrl(buffer: AudioBuffer): Promise<string> {
  const wavBlob = audioBufferToWav(buffer);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(wavBlob);
  });
}
