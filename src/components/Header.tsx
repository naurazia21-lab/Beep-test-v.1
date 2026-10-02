import React from 'react';
import { Mic, Play, Download, ListOrdered, Settings, Activity } from 'lucide-react';
import { VoiceBank } from '../types/beepTest';
import { getVoiceBankStats } from '../services/voiceBankStore';

interface HeaderProps {
  activeTab: 'recorder' | 'runner' | 'exporter' | 'transcript';
  setActiveTab: (tab: 'recorder' | 'runner' | 'exporter' | 'transcript') => void;
  voiceBank: VoiceBank;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  voiceBank,
  onOpenSettings,
}) => {
  const stats = getVoiceBankStats(voiceBank);

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                  Beep Test Voice Changer & Studio
                </h1>
                <span className="text-[11px] font-mono font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded">
                  20m Shuttle Run
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span>Replace Official Audio With Your Voice</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-zinc-300">
                  {stats.recordedCount} / {stats.totalCount} cues recorded ({stats.percentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Segmented Control */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('recorder')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'recorder'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('runner')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'runner'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Live Test</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('exporter')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'exporter'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('transcript')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'transcript'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Cues & Script</span>
              </button>
            </nav>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
              title="Audio & Sound Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
