import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  Award,
  Zap,
  Clock,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { AudioSettings, VoiceBank } from '../types/beepTest';
import { ALL_SHUTTLES, BEEP_TEST_LEVELS } from '../data/beepTestProtocol';
import {
  getAudioContext,
  scheduleBeep,
  playVoiceAnnouncement,
  hasRecordedVoiceForCue,
} from '../services/audioEngine';

interface LiveBeepTestRunnerProps {
  voiceBank: VoiceBank;
  audioSettings: AudioSettings;
}

export const LiveBeepTestRunner: React.FC<LiveBeepTestRunnerProps> = ({
  voiceBank,
  audioSettings,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [shuttleIndex, setShuttleIndex] = useState(0); // 0 to ALL_SHUTTLES.length - 1
  const [shuttleProgress, setShuttleProgress] = useState(0); // 0 to 1
  const [runnerDirection, setRunnerDirection] = useState<'A_to_B' | 'B_to_A'>('A_to_B');
  const [testTimeSeconds, setTestTimeSeconds] = useState(0);
  const [currentAnnouncement, setCurrentAnnouncement] = useState('Press Start to Begin');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // References for timing loop
  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const shuttleElapsedRef = useRef(0);
  const shuttleIndexRef = useRef(0);
  const isRunningRef = useRef(false);

  shuttleIndexRef.current = shuttleIndex;
  isRunningRef.current = isRunning;

  const currentShuttle = ALL_SHUTTLES[shuttleIndex] || ALL_SHUTTLES[0];
  const currentLevelInfo = BEEP_TEST_LEVELS.find((l) => l.level === currentShuttle.level) || BEEP_TEST_LEVELS[0];

  // Trigger beep and announcement for a shuttle
  const triggerShuttleCue = useCallback(
    async (shuttleIdx: number) => {
      const target = ALL_SHUTTLES[shuttleIdx];
      if (!target) return;

      const audioCtx = getAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 1. Play Beep
      scheduleBeep(
        audioCtx,
        audioCtx.destination,
        audioCtx.currentTime,
        target.isLevelStart ? 'triple' : 'single',
        audioSettings
      );

      // 2. Play Voice Announcement
      setCurrentAnnouncement(target.cueText);
      setIsVoiceActive(true);

      const isRecorded = hasRecordedVoiceForCue(target.cueText, voiceBank);
      console.log(`Announcing shuttle: ${target.cueText} (Using recorded voice: ${isRecorded})`);

      // Offset slightly like the official track
      setTimeout(async () => {
        await playVoiceAnnouncement(target.cueText, voiceBank, audioSettings, audioCtx);
        setIsVoiceActive(false);
      }, target.isLevelStart ? 400 : 300);
    },
    [audioSettings, voiceBank]
  );

  // Animation & Clock Loop
  const tick = useCallback(
    (timestamp: number) => {
      if (!isRunningRef.current) return;

      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setTestTimeSeconds((prev) => prev + deltaSeconds);
      shuttleElapsedRef.current += deltaSeconds;

      const currentTarget = ALL_SHUTTLES[shuttleIndexRef.current];
      if (!currentTarget) {
        setIsRunning(false);
        return;
      }

      const duration = currentTarget.durationSeconds;
      const progress = Math.min(1, shuttleElapsedRef.current / duration);
      setShuttleProgress(progress);

      // Has reached end of shuttle?
      if (shuttleElapsedRef.current >= duration) {
        shuttleElapsedRef.current = 0;
        const nextIndex = shuttleIndexRef.current + 1;

        if (nextIndex < ALL_SHUTTLES.length) {
          setShuttleIndex(nextIndex);
          shuttleIndexRef.current = nextIndex;
          // Toggle direction
          setRunnerDirection((d) => (d === 'A_to_B' ? 'B_to_A' : 'A_to_B'));
          // Trigger next beep & announcement
          triggerShuttleCue(nextIndex);
        } else {
          // Finished all 21 levels!
          setIsRunning(false);
          setCurrentAnnouncement('That is the end of the final level.');
          playVoiceAnnouncement('That is the end of the final level.', voiceBank, audioSettings);
          return;
        }
      }

      requestRef.current = requestAnimationFrame(tick);
    },
    [triggerShuttleCue, voiceBank, audioSettings]
  );

  // Start or resume test
  const handleStart = async () => {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (!isRunning) {
      if (shuttleIndex === 0 && shuttleElapsedRef.current === 0) {
        // Play intro announcement before starting
        setCurrentAnnouncement('The multi-stage fitness test will start in 5 seconds.');
        await playVoiceAnnouncement('The multi-stage fitness test will start in 5 seconds.', voiceBank, audioSettings, audioCtx);

        setTimeout(async () => {
          setCurrentAnnouncement('Ready.');
          await playVoiceAnnouncement('Ready.', voiceBank, audioSettings, audioCtx);

          setTimeout(() => {
            setIsRunning(true);
            lastTimestampRef.current = null;
            triggerShuttleCue(0);
            requestRef.current = requestAnimationFrame(tick);
          }, 2000);
        }, 3000);
        return;
      }

      setIsRunning(true);
      lastTimestampRef.current = null;
      requestRef.current = requestAnimationFrame(tick);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const handleReset = () => {
    handlePause();
    setShuttleIndex(0);
    shuttleIndexRef.current = 0;
    shuttleElapsedRef.current = 0;
    setShuttleProgress(0);
    setTestTimeSeconds(0);
    setRunnerDirection('A_to_B');
    setCurrentAnnouncement('Ready to Begin');
  };

  const handleSkipLevel = (direction: 'next' | 'prev') => {
    const curLevel = currentShuttle.level;
    let targetShuttleIdx = 0;

    if (direction === 'next') {
      const nextLvl = Math.min(21, curLevel + 1);
      const found = ALL_SHUTTLES.findIndex((s) => s.level === nextLvl);
      if (found !== -1) targetShuttleIdx = found;
    } else {
      const prevLvl = Math.max(1, curLevel - 1);
      const found = ALL_SHUTTLES.findIndex((s) => s.level === prevLvl);
      if (found !== -1) targetShuttleIdx = found;
    }

    setShuttleIndex(targetShuttleIdx);
    shuttleIndexRef.current = targetShuttleIdx;
    shuttleElapsedRef.current = 0;
    setShuttleProgress(0);
    if (isRunning) {
      triggerShuttleCue(targetShuttleIdx);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Remaining seconds until next beep
  const remainingShuttleSeconds = Math.max(
    0,
    currentShuttle.durationSeconds - shuttleProgress * currentShuttle.durationSeconds
  );

  // Position of runner along the 20m track (0% to 100%)
  const runnerPositionPercent =
    runnerDirection === 'A_to_B' ? shuttleProgress * 100 : (1 - shuttleProgress) * 100;

  const isCustomVoiceForCurrent = hasRecordedVoiceForCue(currentShuttle.cueText, voiceBank);

  return (
    <div className="space-y-6">
      {/* Athletic Telemetry HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Current Level</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono">
            {currentShuttle.level}
            <span className="text-sm font-normal text-zinc-500 ml-1">/ 21</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Shuttle</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
            {currentShuttle.shuttle}
            <span className="text-sm font-normal text-zinc-500 ml-1">/ {currentLevelInfo.shuttlesCount}</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Speed</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
            {currentShuttle.speedKmH.toFixed(1)}
            <span className="text-xs font-normal text-zinc-400 ml-1">km/h</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Total Distance</div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-100 mt-1 font-mono">
            {currentShuttle.cumulativeDistanceMeters}
            <span className="text-xs font-normal text-zinc-400 ml-1">m</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Est. VO2 Max</div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1 font-mono">
            {currentShuttle.estimatedVO2Max}
            <span className="text-[10px] font-normal text-zinc-400 ml-1">ml/kg</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Elapsed Time</div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-200 mt-1 font-mono">
            {formatTime(testTimeSeconds)}
          </div>
        </div>
      </div>

      {/* Main 20m Visual Track Arena */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Voice Cue Announcement Display */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isVoiceActive ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'
              }`}
            />
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                Spoken Voice Announcement
              </div>
              <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                "{currentAnnouncement}"
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCustomVoiceForCurrent ? (
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Playing In Your Voice</span>
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md">
                Speech Synthesis fallback
              </div>
            )}
          </div>
        </div>

        {/* 20-Meter Shuttle Course Track Graphic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Marker A (0m)</span>
            </span>
            <span className="text-zinc-500 tracking-wider">
              20 METERS · {currentShuttle.durationSeconds.toFixed(2)}s PER SHUTTLE
            </span>
            <span className="flex items-center gap-1.5">
              <span>Marker B (20m)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            </span>
          </div>

          {/* Track Visual Container */}
          <div className="relative h-20 bg-zinc-950 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-inner flex items-center px-4">
            {/* Athletic track line markings */}
            <div className="absolute inset-y-0 left-0 w-3 bg-amber-500/20 border-r-2 border-amber-500" />
            <div className="absolute inset-y-0 right-0 w-3 bg-amber-500/20 border-l-2 border-amber-500" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-dashed border-zinc-800" />

            {/* Runner Avatar */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 flex flex-col items-center"
              style={{
                left: `calc(16px + ${runnerPositionPercent}% * 0.92)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="h-10 w-10 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-lg shadow-amber-500/30 border-2 border-white ring-4 ring-amber-500/20">
                🏃
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 mt-1 whitespace-nowrap bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-800">
                {runnerDirection === 'A_to_B' ? '→ 20m' : '← 0m'}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown Ring & Beep Gauge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-black font-mono text-white">
                {remainingShuttleSeconds.toFixed(1)}s
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Until Next Beep
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="text-xs text-zinc-400 font-mono">
              Pacing: {(20 / currentShuttle.durationSeconds).toFixed(2)} m/s
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSkipLevel('prev')}
              className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
              title="Previous Level"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Test</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-200 hover:bg-white text-zinc-950 font-black text-sm rounded-xl shadow-lg transition-all active:scale-95"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
              title="Reset Test"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSkipLevel('next')}
              className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-colors"
              title="Next Level"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
