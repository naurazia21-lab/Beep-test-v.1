import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Trash2,
  Sparkles,
  Radio,
  Sliders,
  Layers,
} from 'lucide-react';
import { AudioSettings, VoiceBank, VoiceSlotKey } from '../types/beepTest';
import { VOICE_SLOT_DEFINITIONS } from '../data/beepTestProtocol';
import {
  getAudioContext,
  decodeAudioBlob,
  playVoiceAnnouncement,
  detectPitchFromAudio,
} from '../services/audioEngine';
import {
  trimAudioBufferSilence,
  bufferToDataUrl,
  getVoiceBankStats,
} from '../services/voiceBankStore';

interface VoiceRecorderStudioProps {
  voiceBank: VoiceBank;
  setVoiceBank: React.Dispatch<React.SetStateAction<VoiceBank>>;
  audioSettings: AudioSettings;
  onTestShuttle: (level: number, shuttle: number) => void;
}

export const VoiceRecorderStudio: React.FC<VoiceRecorderStudioProps> = ({
  voiceBank,
  setVoiceBank,
  audioSettings,
  onTestShuttle,
}) => {
  const [activeMode, setActiveMode] = useState<'guided' | 'grid'>('guided');
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [detectedPitch, setDetectedPitch] = useState<number | null>(voiceBank.voicePitchHz || null);
  const [previewPlayingKey, setPreviewPlayingKey] = useState<string | null>(null);

  // Test preview level and shuttle
  const [testLevel, setTestLevel] = useState(1);
  const [testShuttle, setTestShuttle] = useState(1);

  // Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const currentDef = VOICE_SLOT_DEFINITIONS[currentSlotIndex] || VOICE_SLOT_DEFINITIONS[0];
  const stats = getVoiceBankStats(voiceBank);

  // Initialize microphone stream & analyser
  const initMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      setMicPermission('granted');

      const audioCtx = getAudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserNodeRef.current = analyser;

      // Monitor audio levels & pitch
      const dataArray = new Float32Array(analyser.fftSize);
      const checkAudio = () => {
        if (!analyserNodeRef.current) return;
        analyserNodeRef.current.getFloatTimeDomainData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setMicVolumeLevel(Math.min(1, rms * 5));

        // Pitch detection
        const pitch = detectPitchFromAudio(dataArray, audioCtx.sampleRate);
        if (pitch && pitch > 70 && pitch < 400) {
          setDetectedPitch(pitch);
          setVoiceBank((prev) => ({ ...prev, voicePitchHz: pitch }));
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      animationFrameRef.current = requestAnimationFrame(checkAudio);

      return stream;
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      setMicPermission('denied');
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start recording current slot
  const startRecording = async () => {
    let stream = micStreamRef.current;
    if (!stream || !stream.active) {
      stream = await initMicrophone();
      if (!stream) return;
    }

    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    audioChunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const buffer = await decodeAudioBlob(rawBlob, audioCtx);
          // Auto-trim silence from beginning and end
          const trimmedBuffer = trimAudioBufferSilence(buffer);
          const dataUrl = await bufferToDataUrl(trimmedBuffer);

          setVoiceBank((prev) => {
            const nextSlots = { ...prev.slots, [currentDef.key]: dataUrl };
            return { ...prev, slots: nextSlots };
          });

          // Play immediate preview
          playSlotAudio(currentDef.key, dataUrl);

          // Auto-advance to next slot
          if (autoAdvance && currentSlotIndex < VOICE_SLOT_DEFINITIONS.length - 1) {
            setTimeout(() => {
              setCurrentSlotIndex((prev) => prev + 1);
            }, 600);
          }
        } catch (error) {
          console.error('Failed to process recorded audio', error);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 5) {
            stopRecording();
            return 5;
          }
          return s + 0.1;
        });
      }, 100);
    } catch (e) {
      console.error('Error starting MediaRecorder', e);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Play audio for a specific slot
  const playSlotAudio = useCallback(async (key: VoiceSlotKey, directDataUrl?: string) => {
    const dataUrl = directDataUrl || voiceBank.slots[key];
    if (!dataUrl) return;

    try {
      setPreviewPlayingKey(key);
      const audioCtx = getAudioContext();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const buffer = await decodeAudioBlob(blob, audioCtx);

      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = audioSettings.voiceVolume;

      source.buffer = buffer;
      source.connect(gain);
      gain.connect(audioCtx.destination);

      source.onended = () => {
        setPreviewPlayingKey(null);
      };

      source.start();
    } catch (err) {
      console.error('Failed to play preview', err);
      setPreviewPlayingKey(null);
    }
  }, [audioSettings.voiceVolume, voiceBank.slots]);

  // Delete a recorded slot
  const deleteSlot = (key: VoiceSlotKey) => {
    setVoiceBank((prev) => {
      const nextSlots = { ...prev.slots };
      delete nextSlots[key];
      return { ...prev, slots: nextSlots };
    });
  };

  // Pitch category string
  const getPitchLabel = (hz: number | null) => {
    if (!hz) return 'Calibrating voice...';
    if (hz < 115) return `${hz} Hz · Bass`;
    if (hz < 155) return `${hz} Hz · Baritone`;
    if (hz < 190) return `${hz} Hz · Tenor`;
    if (hz < 240) return `${hz} Hz · Alto`;
    return `${hz} Hz · Soprano`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Tracker */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
                Voice Bank Status
              </span>
              <span className="text-zinc-600 font-mono">/</span>
              <span className="text-xs font-mono text-zinc-300">
                {stats.recordedCount} of {stats.totalCount} cues ready
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Record these phrases once with your microphone. The app dynamically stitches your voice
              for all 21 levels and 247 shuttles of the official test!
            </p>
          </div>

          {/* Quick Stats & Mode Switch */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-500 animate-ping' : 'text-emerald-400'}`} />
              <span className="text-xs font-mono text-zinc-300">
                {getPitchLabel(detectedPitch)}
              </span>
            </div>

            <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveMode('guided')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeMode === 'guided'
                    ? 'bg-amber-500 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mic className="w-3 h-3" />
                <span>Guided Step-by-Step</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeMode === 'grid'
                    ? 'bg-amber-500 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>All 26 Cues</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-3">
          <div className="flex-1 bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className="text-xs font-mono font-medium text-amber-400 whitespace-nowrap">
            {stats.percentage}% Completed
          </span>
        </div>
      </div>

      {/* Guided Mode View */}
      {activeMode === 'guided' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Teleprompter & Recording Panel */}
          <div className="lg:col-span-8 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between min-h-[420px] relative overflow-hidden">
            {/* Subtle background glow when recording */}
            {isRecording && (
              <div className="absolute inset-0 bg-rose-500/5 pointer-events-none animate-pulse" />
            )}

            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-amber-400/90 font-semibold uppercase tracking-wider">
                  Cue {currentSlotIndex + 1} of {VOICE_SLOT_DEFINITIONS.length}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{currentDef.label}</span>
              </div>

              {/* Auto advance toggle */}
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Auto-advance on record</span>
              </label>
            </div>

            {/* Big Spoken Cue Prompter */}
            <div className="my-8 text-center space-y-4">
              <div className="inline-block text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Speak This Phrase Clearly
              </div>
              <div className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-snug">
                "{currentDef.phrase}"
              </div>
              {currentDef.guideTip && (
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                  {currentDef.guideTip}
                </p>
              )}
            </div>

            {/* Live Mic Meter & Visualizer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Microphone Input Level</span>
                </div>
                {isRecording && (
                  <span className="text-rose-400 font-bold animate-pulse">
                    RECORDING ({recordingSeconds.toFixed(1)}s)
                  </span>
                )}
              </div>

              <div className="h-3 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden flex items-center p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    isRecording ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.max(4, micVolumeLevel * 100)}%` }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-zinc-800/80 mt-6">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => setCurrentSlotIndex((i) => Math.max(0, i - 1))}
                disabled={currentSlotIndex === 0 || isRecording}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {/* Record / Stop Button */}
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2.5 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg transition-all transform active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>
                      {voiceBank.slots[currentDef.key] ? 'Re-record Cue' : 'Record Cue'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2.5 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg animate-pulse transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Recording</span>
                  </button>
                )}

                {/* Preview Button if recorded */}
                {voiceBank.slots[currentDef.key] && !isRecording && (
                  <button
                    type="button"
                    onClick={() => playSlotAudio(currentDef.key)}
                    disabled={previewPlayingKey === currentDef.key}
                    className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs rounded-xl border border-zinc-700 transition-colors"
                    title="Play recorded clip"
                  >
                    <Play className={`w-3.5 h-3.5 ${previewPlayingKey === currentDef.key ? 'text-amber-400 animate-spin' : ''}`} />
                    <span>Play Preview</span>
                  </button>
                )}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentSlotIndex((i) => Math.min(VOICE_SLOT_DEFINITIONS.length - 1, i + 1))}
                disabled={currentSlotIndex === VOICE_SLOT_DEFINITIONS.length - 1 || isRecording}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick List & Announcement Simulator Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Test Announcement Box */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Live Audio Stitcher Test
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Real-time</span>
              </div>
              <p className="text-xs text-zinc-400">
                Choose any shuttle to hear how your recorded voice sounds announcing it:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Level (1-21)</label>
                  <select
                    value={testLevel}
                    onChange={(e) => setTestLevel(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {Array.from({ length: 21 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Level {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Shuttle</label>
                  <select
                    value={testShuttle}
                    onChange={(e) => setTestShuttle(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {Array.from({ length: 16 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Shuttle {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg text-center">
                <div className="text-[11px] font-mono text-zinc-500 uppercase">Announcement Cue</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {testShuttle === 1 ? `Start level ${testLevel} 1` : `Level ${testLevel} ${testShuttle}`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTestShuttle(testLevel, testShuttle)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Hear With My Voice</span>
              </button>
            </div>

            {/* Cue Checklist Sidebar */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Cue Playlist
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  {stats.recordedCount}/{stats.totalCount}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {VOICE_SLOT_DEFINITIONS.map((def, idx) => {
                  const isRecorded = !!voiceBank.slots[def.key];
                  const isCurrent = idx === currentSlotIndex;

                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => setCurrentSlotIndex(idx)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold'
                          : 'hover:bg-zinc-800/60 text-zinc-400'
                      }`}
                    >
                      <span className="truncate">{def.label}</span>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {isRecorded ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-zinc-700" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Mode View */}
      {activeMode === 'grid' && (
        <div className="space-y-6">
          {/* Core phrases */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Core Test Commands
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {VOICE_SLOT_DEFINITIONS.filter((d) => d.category === 'core' || d.category === 'outro').map((def) => {
                const isRecorded = !!voiceBank.slots[def.key];
                return (
                  <div
                    key={def.key}
                    className={`p-4 rounded-xl border transition-all ${
                      isRecorded
                        ? 'bg-zinc-900/90 border-emerald-500/30'
                        : 'bg-zinc-900/40 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-zinc-200">{def.label}</span>
                      {isRecorded && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Recorded
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white mb-3">"{def.phrase}"</div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentSlotIndex(VOICE_SLOT_DEFINITIONS.findIndex((d) => d.key === def.key));
                          setActiveMode('guided');
                        }}
                        className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-medium transition-colors text-center"
                      >
                        {isRecorded ? 'Re-record' : 'Record'}
                      </button>

                      {isRecorded && (
                        <>
                          <button
                            type="button"
                            onClick={() => playSlotAudio(def.key)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs"
                            title="Play"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSlot(def.key)}
                            className="p-1.5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded text-xs"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Numbers 1-21 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Spoken Numbers (1 to 21)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {VOICE_SLOT_DEFINITIONS.filter((d) => d.category === 'number').map((def) => {
                const isRecorded = !!voiceBank.slots[def.key];
                return (
                  <div
                    key={def.key}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isRecorded
                        ? 'bg-zinc-900/90 border-emerald-500/30'
                        : 'bg-zinc-900/40 border-zinc-800'
                    }`}
                  >
                    <div className="text-xl font-black text-white">{def.phrase}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {isRecorded ? 'Ready' : 'Missing'}
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-2.5 pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentSlotIndex(VOICE_SLOT_DEFINITIONS.findIndex((d) => d.key === def.key));
                          setActiveMode('guided');
                        }}
                        className="p-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded"
                        title="Record this number"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>

                      {isRecorded && (
                        <button
                          type="button"
                          onClick={() => playSlotAudio(def.key)}
                          className="p-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded"
                          title="Preview"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
