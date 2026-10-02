import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceRecorderStudio } from './components/VoiceRecorderStudio';
import { LiveBeepTestRunner } from './components/LiveBeepTestRunner';
import { AudioExporter } from './components/AudioExporter';
import { OriginalAudioInspector } from './components/OriginalAudioInspector';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AudioSettings, VoiceBank } from './types/beepTest';
import {
  loadSavedVoiceBank,
  saveVoiceBank,
  loadAudioSettings,
  saveAudioSettings,
} from './services/voiceBankStore';
import {
  getAudioContext,
  scheduleBeep,
  playVoiceAnnouncement,
} from './services/audioEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'recorder' | 'runner' | 'exporter' | 'transcript'>('recorder');
  const [voiceBank, setVoiceBank] = useState<VoiceBank>(loadSavedVoiceBank);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveVoiceBank(voiceBank);
  }, [voiceBank]);

  useEffect(() => {
    saveAudioSettings(audioSettings);
  }, [audioSettings]);

  // Handler to test a specific shuttle announcement
  const handleTestShuttle = async (level: number, shuttle: number) => {
    const isStart = shuttle === 1;
    const cue = isStart ? `Start level ${level} 1` : `Level ${level} ${shuttle}`;

    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // Play Beep
    scheduleBeep(
      audioCtx,
      audioCtx.destination,
      audioCtx.currentTime,
      isStart ? 'triple' : 'single',
      audioSettings
    );

    // Play voice announcement right after beep
    setTimeout(async () => {
      await playVoiceAnnouncement(cue, voiceBank, audioSettings, audioCtx);
    }, isStart ? 400 : 300);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voiceBank={voiceBank}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'recorder' && (
          <VoiceRecorderStudio
            voiceBank={voiceBank}
            setVoiceBank={setVoiceBank}
            audioSettings={audioSettings}
            onTestShuttle={handleTestShuttle}
          />
        )}

        {activeTab === 'runner' && (
          <LiveBeepTestRunner
            voiceBank={voiceBank}
            audioSettings={audioSettings}
          />
        )}

        {activeTab === 'exporter' && (
          <AudioExporter
            voiceBank={voiceBank}
            audioSettings={audioSettings}
            setAudioSettings={setAudioSettings}
          />
        )}

        {activeTab === 'transcript' && (
          <OriginalAudioInspector
            voiceBank={voiceBank}
            audioSettings={audioSettings}
          />
        )}
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Official 20-Meter Shuttle Run (Multi-Stage Fitness Test / PACER / Bleep Test)</span>
          <span className="font-mono text-zinc-500">21 Levels · 247 Shuttles · Leger Protocol</span>
        </div>
      </footer>

      <AudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
        voiceBank={voiceBank}
        setVoiceBank={setVoiceBank}
      />
    </div>
  );
}
