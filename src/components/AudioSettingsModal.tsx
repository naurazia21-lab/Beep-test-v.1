import React, { useRef } from 'react';
import { X, Volume2, HardDrive, RotateCcw, Upload, Download, Mic } from 'lucide-react';
import { AudioSettings, VoiceBank } from '../types/beepTest';
import { DEFAULT_AUDIO_SETTINGS, saveVoiceBank } from '../services/voiceBankStore';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  voiceBank: VoiceBank;
  setVoiceBank: React.Dispatch<React.SetStateAction<VoiceBank>>;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  audioSettings,
  setAudioSettings,
  voiceBank,
  setVoiceBank,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(voiceBank, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'beeptest-voicebank-backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed.slots === 'object') {
          setVoiceBank(parsed);
          saveVoiceBank(parsed);
          alert('Voice bank imported successfully!');
        } else {
          alert('Invalid voice bank file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearVoiceBank = () => {
    if (window.confirm('Are you sure you want to clear all recorded voice clips? This cannot be undone.')) {
      const resetBank: VoiceBank = {
        slots: {},
        userName: 'My Voice',
        voicePitchHz: 145,
      };
      setVoiceBank(resetBank);
      saveVoiceBank(resetBank);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Audio & Voice Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Beep Pitch Tuning */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
              <span>Beep Tone Frequency</span>
              <span className="font-mono text-amber-400">{audioSettings.beepPitch} Hz</span>
            </div>
            <input
              type="range"
              min={1000}
              max={2500}
              step={50}
              value={audioSettings.beepPitch}
              onChange={(e) =>
                setAudioSettings((s) => ({ ...s, beepPitch: Number(e.target.value) }))
              }
              className="w-full accent-amber-500"
            />
            <p className="text-[11px] text-zinc-500">
              1800 Hz is the classic audio standard used in official beep test tracks.
            </p>
          </div>

          {/* Voice Fallback */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Speech Synthesis Fallback
              </div>
              <p className="text-[11px] text-zinc-400">
                Use browser speech synthesis (matched to your vocal pitch) for any unrecorded slots.
              </p>
            </div>
            <input
              type="checkbox"
              checked={audioSettings.speechSynthesisFallback}
              onChange={(e) =>
                setAudioSettings((s) => ({ ...s, speechSynthesisFallback: e.target.checked }))
              }
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0"
            />
          </div>

          {/* Voice Bank Backup & Migration */}
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-200">Voice Bank Backup & Export</div>
            <p className="text-[11px] text-zinc-400">
              Export your recorded voice pack as a JSON file to transfer between devices or save a
              local backup.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup Voice JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Voice JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </div>

          {/* Danger Zone: Clear voice */}
          <div className="pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleClearVoiceBank}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
            >
              Reset all recorded voice clips
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
