import { AudioSettings, VoiceBank, VoiceSlotKey } from '../types/beepTest';
import { BEEP_TEST_LEVELS } from '../data/beepTestProtocol';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

// Convert audio blob to ArrayBuffer / AudioBuffer
export async function decodeAudioBlob(blob: Blob, ctx: BaseAudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Convert base64 data URL to AudioBuffer
const audioBufferCache = new Map<string, AudioBuffer>();

export async function getBufferFromDataUrl(dataUrl: string, ctx: BaseAudioContext): Promise<AudioBuffer> {
  if (audioBufferCache.has(dataUrl)) {
    return audioBufferCache.get(dataUrl)!;
  }
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const buffer = await decodeAudioBlob(blob, ctx);
  audioBufferCache.set(dataUrl, buffer);
  return buffer;
}

// Synthesize single or triple beep into an AudioContext destination
export function scheduleBeep(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startTime: number,
  type: 'single' | 'triple',
  settings: AudioSettings
): number {
  const now = startTime;
  const baseFreq = settings.beepPitch || 1800;
  const volume = settings.beepVolume;

  if (type === 'single') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (settings.beepType === 'digital') {
      osc.type = 'square';
    } else if (settings.beepType === 'whistle') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 1.2, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.1);
    } else {
      osc.type = 'sine';
    }

    if (settings.beepType !== 'whistle') {
      osc.frequency.setValueAtTime(baseFreq, now);
    }

    // Envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.015);
    gain.gain.setValueAtTime(volume * 0.7, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.36);
    return 0.36;
  } else {
    // Triple beep
    const beeps = [
      { freq: baseFreq, dur: 0.12, pause: 0.08 },
      { freq: baseFreq, dur: 0.12, pause: 0.08 },
      { freq: baseFreq * 1.25, dur: 0.22, pause: 0 },
    ];

    let t = now;
    for (const b of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = settings.beepType === 'digital' ? 'square' : 'sine';
      osc.frequency.setValueAtTime(b.freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume * 0.75, t + 0.01);
      gain.gain.setValueAtTime(volume * 0.75, t + b.dur - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + b.dur);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(t);
      osc.stop(t + b.dur);

      t += b.dur + b.pause;
    }
    return t - now;
  }
}

// Convert cue text to sequence of voice slot keys
export function getSlotKeysForCue(cueText: string): VoiceSlotKey[] {
  const trimmed = cueText.trim();
  if (trimmed.startsWith('The multi-stage fitness test')) {
    return ['intro'];
  }
  if (trimmed.toLowerCase().includes('ready')) {
    return ['ready'];
  }
  if (trimmed.toLowerCase().includes('end of the final level')) {
    return ['outro'];
  }

  // e.g. "Start level 1 1"
  if (trimmed.startsWith('Start level')) {
    const parts = trimmed.split(' ');
    // parts = ["Start", "level", "1", "1"]
    const lvlNum = parts[2];
    const shuttleNum = parts[3];
    return ['start_level', `num_${lvlNum}` as VoiceSlotKey, `num_${shuttleNum}` as VoiceSlotKey];
  }

  // e.g. "Level 1 2"
  if (trimmed.startsWith('Level')) {
    const parts = trimmed.split(' ');
    // parts = ["Level", "1", "2"]
    const lvlNum = parts[1];
    const shuttleNum = parts[2];
    return ['level', `num_${lvlNum}` as VoiceSlotKey, `num_${shuttleNum}` as VoiceSlotKey];
  }

  return [];
}

// Check how many slots are recorded for a cue
export function hasRecordedVoiceForCue(cueText: string, voiceBank: VoiceBank): boolean {
  const keys = getSlotKeysForCue(cueText);
  if (keys.length === 0) return false;
  return keys.every((k) => !!voiceBank.slots[k]);
}

// Play voice announcement in real-time
export async function playVoiceAnnouncement(
  cueText: string,
  voiceBank: VoiceBank,
  settings: AudioSettings,
  audioCtx: AudioContext = getAudioContext()
): Promise<void> {
  const keys = getSlotKeysForCue(cueText);
  const allRecorded = keys.length > 0 && keys.every((k) => !!voiceBank.slots[k]);

  if (allRecorded) {
    // Play recorded clips in sequence
    let currentOffset = audioCtx.currentTime;
    for (const key of keys) {
      const dataUrl = voiceBank.slots[key]!;
      try {
        const buffer = await getBufferFromDataUrl(dataUrl, audioCtx);
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = settings.voiceVolume;

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start(currentOffset);
        // Small 60ms gap between concatenated numbers for natural speech
        currentOffset += Math.max(0.2, buffer.duration) + 0.05;
      } catch (err) {
        console.warn('Error playing recorded slot', key, err);
      }
    }
  } else if (settings.speechSynthesisFallback && 'speechSynthesis' in window) {
    // Speech synthesis fallback with custom pitch matching the user's recorded pitch profile
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cueText);
      utterance.volume = settings.voiceVolume;
      utterance.rate = 1.05;

      // Adjust pitch based on user's pitch profile
      if (voiceBank.voicePitchHz) {
        // Average human voice: ~140Hz. Map 80Hz - 260Hz to 0.7 - 1.4 pitch
        const pitchRatio = Math.max(0.6, Math.min(1.6, voiceBank.voicePitchHz / 150));
        utterance.pitch = pitchRatio;
      } else {
        utterance.pitch = 1.0;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

// Schedule voice cue into OfflineAudioContext
export async function scheduleVoiceInOfflineContext(
  ctx: OfflineAudioContext,
  destination: AudioNode,
  startTime: number,
  cueText: string,
  voiceBank: VoiceBank,
  settings: AudioSettings
): Promise<number> {
  const keys = getSlotKeysForCue(cueText);
  let duration = 0;

  let currentOffset = startTime;
  for (const key of keys) {
    const dataUrl = voiceBank.slots[key];
    if (dataUrl) {
      try {
        const buffer = await getBufferFromDataUrl(dataUrl, ctx);
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = settings.voiceVolume;

        source.buffer = buffer;
        source.connect(gain);
        gain.connect(destination);

        source.start(currentOffset);
        const itemDuration = buffer.duration + 0.06;
        currentOffset += itemDuration;
        duration += itemDuration;
      } catch (e) {
        console.error('Failed to schedule slot in offline ctx', key, e);
      }
    }
  }

  return duration;
}

// Convert AudioBuffer to WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF header
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, format, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  // bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length, true);

  // Write PCM samples
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channelData[channel][i];
      // Clamp
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Master Render Full Audio Function using OfflineAudioContext
export async function renderBeepTestAudio(
  startLevel: number,
  endLevel: number,
  voiceBank: VoiceBank,
  settings: AudioSettings,
  onProgress?: (progressPercent: number) => void
): Promise<Blob> {
  const sampleRate = 44100;
  const filteredLevels = BEEP_TEST_LEVELS.filter((l) => l.level >= startLevel && l.level <= endLevel);

  // Calculate total time
  let totalTimeSeconds = 14; // intro ~13s + padding
  for (const lvl of filteredLevels) {
    totalTimeSeconds += lvl.shuttlesCount * lvl.shuttleDurationSeconds;
  }
  totalTimeSeconds += 6; // outro & finish padding

  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalTimeSeconds * sampleRate), sampleRate);
  const masterGain = offlineCtx.createGain();
  masterGain.connect(offlineCtx.destination);

  let currentTime = 0;

  // 1. Intro
  if (voiceBank.slots.intro) {
    await scheduleVoiceInOfflineContext(offlineCtx, masterGain, 0.5, 'The multi-stage fitness test will start in 5 seconds.', voiceBank, settings);
  }
  currentTime = 4.2;

  // 2. Ready
  if (voiceBank.slots.ready) {
    await scheduleVoiceInOfflineContext(offlineCtx, masterGain, currentTime, 'Ready.', voiceBank, settings);
  }
  currentTime = 12.0;

  // 3. Shuttles
  const totalShuttlesToRender = filteredLevels.reduce((acc, l) => acc + l.shuttlesCount, 0);
  let renderedShuttles = 0;

  for (const lvl of filteredLevels) {
    for (let s = 1; s <= lvl.shuttlesCount; s++) {
      const isStart = s === 1;

      // Beep
      scheduleBeep(offlineCtx, masterGain, currentTime, isStart ? 'triple' : 'single', settings);

      // Spoken Announcement (starts ~0.3s after beep, exactly like the original track)
      const announcementTime = currentTime + (isStart ? 0.45 : 0.35);
      const cue = isStart ? `Start level ${lvl.level} 1` : `Level ${lvl.level} ${s}`;
      await scheduleVoiceInOfflineContext(offlineCtx, masterGain, announcementTime, cue, voiceBank, settings);

      currentTime += lvl.shuttleDurationSeconds;
      renderedShuttles++;

      if (onProgress && renderedShuttles % 5 === 0) {
        onProgress(Math.round((renderedShuttles / totalShuttlesToRender) * 85));
      }
    }
  }

  // 4. Outro
  if (voiceBank.slots.outro) {
    await scheduleVoiceInOfflineContext(offlineCtx, masterGain, currentTime + 0.5, 'That is the end of the final level.', voiceBank, settings);
  }

  if (onProgress) onProgress(90);

  // Render
  const renderedBuffer = await offlineCtx.startRendering();
  if (onProgress) onProgress(98);

  const wavBlob = audioBufferToWav(renderedBuffer);
  if (onProgress) onProgress(100);

  return wavBlob;
}

// Voice pitch detector using Autocorrelation
export function detectPitchFromAudio(audioData: Float32Array, sampleRate: number): number | null {
  // Autocorrelation algorithm
  const SIZE = audioData.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = audioData[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // too quiet

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(audioData[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(audioData[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = audioData.slice(r1, r2);
  const c = new Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  if (T0 === 0) return null;
  const freq = sampleRate / T0;
  if (freq >= 65 && freq <= 500) {
    return Math.round(freq);
  }
  return null;
}
