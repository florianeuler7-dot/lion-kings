import React, { useEffect, useRef, useState } from 'react';
import { Heart, Flame, Play, Pause, Check, X, Droplet } from 'lucide-react';
import { setLiveStatus } from '../supabase';
import { useWakeLock, vibrate } from '../lib/device';
import { Button, Card, SectionLabel, ProgressRing, IconButton } from '../components/ui';

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function CardioScreen({ onFinish, onCancel, showToast, user, combinedFlow }) {
  useWakeLock();

  const [type, setType] = useState('zone2'); // 'zone2' | 'hiit'
  const [targetMin, setTargetMin] = useState(35);
  const [elapsed, setElapsed] = useState(0); // seconds, display only
  const [running, setRunning] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const lastDrinkRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const startAtRef = useRef(null);     // timestamp when current run-period began
  const accumulatedRef = useRef(0);   // seconds accumulated before current period
  const targetReachedRef = useRef(false);

  const typeName = type === 'hiit' ? 'HIIT Cardio' : 'Zone-2 Cardio';
  const elapsedMin = Math.floor(elapsed / 60);

  // Live status while running
  useEffect(() => {
    if (running && user) setLiveStatus(user.id, typeName, `${elapsedMin} / ${targetMin} Min`);
  }, [running, elapsedMin, type, targetMin, user]);

  // Timestamp-based tick — survives background/lock
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(accumulatedRef.current + Math.floor((Date.now() - startAtRef.current) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(intervalRef.current); document.removeEventListener('visibilitychange', onVisible); };
  }, [running]);

  // Drink reminder every 10 min during cardio
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (Date.now() - lastDrinkRef.current > 10 * 60 * 1000) {
        showToast('Trink etwas Wasser 💧', 'drink');
        lastDrinkRef.current = Date.now();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => { targetReachedRef.current = false; }, [targetMin]);
  useEffect(() => {
    if (running && elapsed >= targetMin * 60 && !targetReachedRef.current) {
      targetReachedRef.current = true;
      showToast(`${targetMin} Min erreicht – stark!`, 'check');
      vibrate([300, 100, 300]);
    }
  }, [elapsed, targetMin, running]);

  const progress = Math.min((elapsed / (targetMin * 60)) * 100, 100);
  const reachedTarget = elapsed >= targetMin * 60;
  const started = running || elapsed > 0;

  const pause = () => {
    accumulatedRef.current += Math.floor((Date.now() - startAtRef.current) / 1000);
    startAtRef.current = null;
    setRunning(false);
  };
  const resume = () => { startAtRef.current = Date.now(); setRunning(true); };
  const start = () => { startAtRef.current = Date.now(); accumulatedRef.current = 0; setRunning(true); };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    if (running) pause();
    const totalSec = accumulatedRef.current;
    const min = Math.max(1, Math.round(totalSec / 60));
    try { await onFinish(min, typeName); } finally { setFinishing(false); }
  };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      <div className="pt-2 pb-3 flex items-center justify-between">
        <div className="w-11" />
        <div className="label">Cardio</div>
        <IconButton icon={X} label="Abbrechen" onClick={onCancel} />
      </div>

      {!started && (
        <div className="flex-1 flex flex-col">
          <div className="label mb-2">Vorbereitung</div>
          <h2 className="font-display text-[2.75rem] text-zinc-50 leading-[0.95] mb-7">CARDIO<br /><span className="text-accent">SETUP</span></h2>

          <Card className="p-5 mb-3">
            <SectionLabel>Typ</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'zone2', Icon: Heart, title: 'ZONE 2', sub: 'locker, 30–40 Min', def: 35 },
                { v: 'hiit', Icon: Flame, title: 'HIIT', sub: 'intensiv, 10–15 Min', def: 15 },
              ].map(({ v, Icon, title, sub, def }) => (
                <button key={v} onClick={() => { setType(v); setTargetMin(def); }}
                  className={`pressable p-4 rounded-2xl border text-center transition-colors ${type === v ? 'bg-accent border-accent text-white shadow-glow' : 'bg-white/[0.03] border-line text-zinc-400'}`}>
                  <Icon className="w-5 h-5 mx-auto mb-2" />
                  <div className="font-display text-lg">{title}</div>
                  <div className="text-xs opacity-75">{sub}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5 mb-6">
            <SectionLabel>Ziel-Dauer</SectionLabel>
            <div className="flex gap-2">
              {(type === 'zone2' ? [30, 35, 40, 45] : [10, 15, 20]).map(m => (
                <button key={m} onClick={() => setTargetMin(m)}
                  className={`pressable flex-1 py-3 rounded-xl border font-display text-xl transition-colors ${targetMin === m ? 'bg-zinc-100 border-zinc-100 text-zinc-950' : 'bg-white/[0.03] border-line text-zinc-400'}`}>
                  {m}<span className="text-xs ml-1 opacity-75 font-body font-semibold">min</span>
                </button>
              ))}
            </div>
          </Card>

          <Button size="xl" className="w-full" onClick={start} icon={Play}>LOS GEHT'S</Button>

          <div className="mt-6 text-zinc-500 text-sm text-center">
            {type === 'zone2'
              ? 'Tempo so, dass du noch reden könntest. HF ~120–140.'
              : '30 Sek volle Power / 60 Sek Pause × Runden.'}
          </div>
        </div>
      )}

      {started && (
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="label mb-6">{typeName} · Ziel {targetMin} Min</div>

          <ProgressRing value={progress} size={270} stroke={12} color={reachedTarget ? '#22c55e' : '#ef4444'}>
            <div className="font-display text-7xl text-zinc-50 leading-none tabular">{fmt(elapsed)}</div>
            <div className={`text-xs mt-2 font-semibold ${reachedTarget ? 'text-ok' : 'text-zinc-500'}`}>
              {reachedTarget ? 'Ziel erreicht ✓' : running ? 'läuft' : 'pausiert'}
            </div>
          </ProgressRing>

          <div className="h-8 mt-4 text-sm text-ok flex items-center gap-2">
            {reachedTarget && <><Check className="w-4 h-4" /> Weitermachen oder beenden</>}
          </div>

          <div className="flex gap-3 mt-6 mb-6 w-full max-w-xs">
            {running ? (
              <Button variant="secondary" size="md" className="flex-1" onClick={pause} icon={Pause}>Pause</Button>
            ) : (
              <Button variant="secondary" size="md" className="flex-1" onClick={resume} icon={Play}>Weiter</Button>
            )}
            <Button size="md" className="flex-1" onClick={handleFinish} icon={Check} disabled={finishing}>
              {combinedFlow ? 'MOBILITY' : 'FERTIG'}
            </Button>
          </div>

          <div className="text-zinc-500 text-xs flex items-center gap-2">
            <Droplet className="w-4 h-4" /> Trink-Erinnerung alle 10 Min
          </div>
          {combinedFlow && (
            <div className="text-zinc-500 text-xs mt-2">Als Nächstes: Mobility – Ganzkörper</div>
          )}
        </div>
      )}
    </div>
  );
}
