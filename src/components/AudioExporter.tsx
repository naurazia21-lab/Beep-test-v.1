import React, { useState } from 'react';
import {
  Download,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  FileAudio,
  Sparkles,
  RefreshCw,
  HardDrive,
  Volume2,
} from 'lucide-react';
import { AudioSettings, VoiceBank } from '../types/beepTest';
import { renderBeepTestAudio } from '../services/audioEngine';
import { getVoiceBankStats } from '../services/voiceBankStore';

interface AudioExporterProps {
  voiceBank: VoiceBank;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
}

export const AudioExporter: React.FC<AudioExporterProps> = ({
  voiceBank,
  audioSettings,
  setAudioSettings,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'quick' | 'standard' | 'police' | 'full'>('full');
  const [startLevel, setStartLevel] = useState(1);
  const [endLevel, setEndLevel] = useState(21);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedAudioUrl, setExportedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const stats = getVoiceBankStats(voiceBank);

  const applyPreset = (preset: 'quick' | 'standard' | 'police' | 'full') => {
    setSelectedPreset(preset);
    if (preset === 'quick') {
      setStartLevel(1);
      setEndLevel(3);
    } else if (preset === 'standard') {
      setStartLevel(1);
      setEndLevel(7);
    } else if (preset === 'police') {
      setStartLevel(1);
      setEndLevel(12);
    } else {
      setStartLevel(1);
      setEndLevel(21);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(5);
    setExportedBlob(null);
    if (exportedAudioUrl) {
      URL.revokeObjectURL(exportedAudioUrl);
      setExportedAudioUrl(null);
    }

    try {
      const blob = await renderBeepTestAudio(
        startLevel,
        endLevel,
        voiceBank,
        audioSettings,
        (progress) => setExportProgress(progress)
      );

      setExportedBlob(blob);
      const url = URL.createObjectURL(blob);
      setExportedAudioUrl(url);
    } catch (err) {
      console.error('Audio export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-amber-400" />
              <span>Export Custom Beep Test Audio File</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Render the complete official Multi-Stage Fitness Test with your custom recorded voice
              and synchronized acoustic beeps. Download as an uncompressed high-fidelity 44.1kHz WAV
              file for portable speakers, track testing, or gyms.
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <span>Mastering Engine: 44.1kHz · 16-Bit PCM WAV</span>
          </div>
        </div>

        {/* Voice coverage advisory */}
        <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-zinc-300">
              Voice Bank coverage: <strong className="text-white">{stats.recordedCount} of {stats.totalCount} cues</strong> ({stats.percentage}%).
              {stats.percentage < 100 && ' Missing cues use synthesis with your detected vocal pitch.'}
            </span>
          </div>
        </div>
      </div>

      {/* Preset & Level Range Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Export Settings */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              1. Choose Duration & Level Target
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => applyPreset('quick')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPreset === 'quick'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">Quick Demo</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Lv 1-3 · ~3 min</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPreset === 'standard'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">School Test</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Lv 1-7 · ~7 min</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('police')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPreset === 'police'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">Police / Military</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Lv 1-12 · ~12 min</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('full')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPreset === 'full'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-bold text-xs">Full 21 Levels</div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Lv 1-21 · ~22 min</div>
              </button>
            </div>

            {/* Custom level bounds */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">Start Level</label>
                <input
                  type="number"
                  min={1}
                  max={endLevel}
                  value={startLevel}
                  onChange={(e) => {
                    setStartLevel(Math.max(1, Math.min(endLevel, Number(e.target.value))));
                    setSelectedPreset('full');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">End Level</label>
                <input
                  type="number"
                  min={startLevel}
                  max={21}
                  value={endLevel}
                  onChange={(e) => {
                    setEndLevel(Math.min(21, Math.max(startLevel, Number(e.target.value))));
                    setSelectedPreset('full');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sound & Mixing Customization */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              2. Sound & Balance Mixing
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                  <span>Voice Cue Volume</span>
                  <span>{Math.round(audioSettings.voiceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={audioSettings.voiceVolume}
                  onChange={(e) =>
                    setAudioSettings((prev) => ({ ...prev, voiceVolume: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1">
                  <span>Beep Tone Volume</span>
                  <span>{Math.round(audioSettings.beepVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={audioSettings.beepVolume}
                  onChange={(e) =>
                    setAudioSettings((prev) => ({ ...prev, beepVolume: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAudioSettings((s) => ({ ...s, beepType: 'classic' }))}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  audioSettings.beepType === 'classic'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                Classic 1800Hz
              </button>
              <button
                type="button"
                onClick={() => setAudioSettings((s) => ({ ...s, beepType: 'digital' }))}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  audioSettings.beepType === 'digital'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                Digital Gym Tone
              </button>
              <button
                type="button"
                onClick={() => setAudioSettings((s) => ({ ...s, beepType: 'whistle' }))}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  audioSettings.beepType === 'whistle'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                Referee Chirp
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Synthesizing Audio ({exportProgress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Render & Generate Audio (Levels {startLevel} - {endLevel})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Master Output Player & Download Card */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Master Audio File Output
            </h3>

            {isExporting && (
              <div className="space-y-3 p-5 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">Rendering Offline Audio Context...</div>
                <p className="text-xs text-zinc-400">
                  Synthesizing exact Leger shuttle intervals, tone envelopes, and voice buffers.
                </p>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {!isExporting && !exportedAudioUrl && (
              <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center space-y-3">
                <FileAudio className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-xs font-medium text-zinc-400">
                  Click "Render & Generate Audio" to synthesize your personalized Beep Test file.
                </div>
              </div>
            )}

            {exportedAudioUrl && exportedBlob && (
              <div className="space-y-4 p-5 bg-zinc-950 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white font-mono">Render Complete</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {formatFileSize(exportedBlob.size)}
                  </span>
                </div>

                {/* Built-in Audio Player */}
                <div className="space-y-2">
                  <audio
                    src={exportedAudioUrl}
                    controls
                    className="w-full h-10 accent-amber-500"
                  />
                </div>

                {/* Direct Download Button */}
                <a
                  href={exportedAudioUrl}
                  download={`beep-test-custom-voice-levels-${startLevel}-to-${endLevel}.wav`}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download WAV Audio File</span>
                </a>
              </div>
            )}
          </div>

          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-2">
            <div className="font-semibold text-zinc-300">How to use your exported file:</div>
            <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-[11px]">
              <li>Play directly from any smartphone, laptop, or tablet.</li>
              <li>Connect to a Bluetooth or aux speaker at your gym or track.</li>
              <li>Official 20-meter distance markings ensure exact VO2 max compliance.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
