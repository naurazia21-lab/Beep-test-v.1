import React, { useState } from 'react';
import {
  ListOrdered,
  Play,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ORIGINAL_TRANSCRIPT_SAMPLE } from '../data/originalTranscript';
import { ALL_SHUTTLES } from '../data/beepTestProtocol';
import { AudioSettings, VoiceBank } from '../types/beepTest';
import {
  getAudioContext,
  playVoiceAnnouncement,
  hasRecordedVoiceForCue,
} from '../services/audioEngine';

interface OriginalAudioInspectorProps {
  voiceBank: VoiceBank;
  audioSettings: AudioSettings;
}

export const OriginalAudioInspector: React.FC<OriginalAudioInspectorProps> = ({
  voiceBank,
  audioSettings,
}) => {
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentlyPlayingCue, setCurrentlyPlayingCue] = useState<string | null>(null);

  const filteredShuttles = ALL_SHUTTLES.filter((item) => {
    if (filterLevel !== 'all' && item.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.cueText.toLowerCase().includes(q) ||
        `level ${item.level}`.includes(q) ||
        `shuttle ${item.shuttle}`.includes(q)
      );
    }
    return true;
  });

  const handlePlayCue = async (cueText: string) => {
    setCurrentlyPlayingCue(cueText);
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    await playVoiceAnnouncement(cueText, voiceBank, audioSettings, audioCtx);
    setCurrentlyPlayingCue(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-amber-400" />
              <span>Uploaded Audio Cues & Timestamp Mapping</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Inspect the exact timeline of the Multi-Stage Fitness Test audio you uploaded (00:00 to
              22:25). Test and preview each shuttle cue with your voice.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search level or shuttle cue (e.g. Level 4 5)..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">Filter Level:</span>
            <select
              value={filterLevel}
              onChange={(e) =>
                setFilterLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
            >
              <option value="all">All Levels (1 to 21)</option>
              {Array.from({ length: 21 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Level {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Intro Special Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
          Opening & Closing Calls
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-zinc-500">00:00 · Intro</div>
              <div className="text-xs font-bold text-white mt-0.5">
                "The multi-stage fitness test will start in 5 seconds."
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePlayCue('The multi-stage fitness test will start in 5 seconds.')}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg shrink-0 ml-2"
              title="Play with My Voice"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-zinc-500">00:04 · Countdown</div>
              <div className="text-xs font-bold text-white mt-0.5">"Ready."</div>
            </div>
            <button
              type="button"
              onClick={() => handlePlayCue('Ready.')}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg shrink-0 ml-2"
              title="Play with My Voice"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-zinc-500">22:17 · Outro</div>
              <div className="text-xs font-bold text-white mt-0.5">
                "That is the end of the final level."
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePlayCue('That is the end of the final level.')}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg shrink-0 ml-2"
              title="Play with My Voice"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Shuttles Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-zinc-300">
            Showing {filteredShuttles.length} Shuttles
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Total Course Distance: 4,940 meters
          </span>
        </div>

        <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
          {filteredShuttles.map((shuttle) => {
            const hasVoice = hasRecordedVoiceForCue(shuttle.cueText, voiceBank);
            const isPlaying = currentlyPlayingCue === shuttle.cueText;

            // Approximate original audio timestamp in mm:ss
            const mins = Math.floor(shuttle.cumulativeTimeSeconds / 60);
            const secs = Math.floor(shuttle.cumulativeTimeSeconds % 60);
            const timestampStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            return (
              <div
                key={shuttle.totalShuttleIndex}
                className="p-3.5 hover:bg-zinc-800/30 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 text-center font-mono text-xs text-zinc-400 bg-zinc-950 py-1 px-1.5 rounded border border-zinc-800">
                    {timestampStr}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        Level {shuttle.level} · Shuttle {shuttle.shuttle}
                      </span>
                      {shuttle.isLevelStart && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                          Triple Beep
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-300 mt-0.5">"{shuttle.cueText}"</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col text-right text-[11px] font-mono text-zinc-400">
                    <span>{shuttle.speedKmH.toFixed(1)} km/h</span>
                    <span className="text-zinc-500">{shuttle.durationSeconds.toFixed(2)}s per 20m</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasVoice ? (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hidden md:inline">
                        Your Voice Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">
                        Synthesized
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePlayCue(shuttle.cueText)}
                      disabled={isPlaying}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 rounded-lg border border-zinc-700 text-xs font-medium transition-colors"
                      title="Listen with custom voice"
                    >
                      <Play className={`w-3 h-3 fill-current ${isPlaying ? 'animate-spin' : ''}`} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
