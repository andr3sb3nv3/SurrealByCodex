import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Check, RefreshCw, Volume2 } from 'lucide-react';
import { Goal, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AppGuideAssistantProps {
  setMood?: (val: number) => void;
  setEnergyLevel?: (val: number) => void;
  setSportLevel?: (val: number) => void;
  setSleepQuality?: (val: number) => void;
  setSocialLevel?: (val: number) => void;
  setMotivationLevel?: (val: number) => void;
  setConcentrationLevel?: (val: number) => void;
  setRegulationLevel?: (val: number) => void;
  setReflection?: (val: any) => void;
  goals?: Goal[];
  onUpdateGoal?: (id: number, status: boolean) => void;
  onSaveRequest?: () => void;
  onStartAudioNote?: () => void;
  onStopAudioNote?: () => Promise<void> | void;
  hasAudioNote?: boolean;
  language: Language;
  enabledMetrics?: string[];
}

type StepType = 'METRIC' | 'GOAL' | 'JOURNAL' | 'AUDIO_NOTE' | 'SAVING' | 'TRANSITION';

interface QuestionStep {
  type: StepType;
  id?: string | number;
  label: string;
  question: string;
  setter?: (val: any) => void;
}

const AUDIO_NOTE_DURATION_MS = 30000;

const AppGuideAssistant: React.FC<AppGuideAssistantProps> = ({
  setMood, setEnergyLevel, setSportLevel, setSleepQuality,
  setSocialLevel, setMotivationLevel, setConcentrationLevel,
  setRegulationLevel, setReflection, goals, onUpdateGoal, onSaveRequest,
  onStartAudioNote, onStopAudioNote, hasAudioNote,
  language, enabledMetrics = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const activeRef = useRef(false);

  const [status, setStatus] = useState<'IDLE' | 'SPEAKING' | 'LISTENING' | 'PROCESSING' | 'SUCCESS' | 'RECORDING'>('IDLE');
  const [currentDisplay, setCurrentDisplay] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioCountdown, setAudioCountdown] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const t = TRANSLATIONS[language];
  const p = t.assistantPrompts;

  const getMetricsConfig = () => [
    { key: 'mood', label: t.indicators.mood.label, question: p.mood, setter: setMood },
    { key: 'energy', label: t.indicators.energy.label, question: p.energy, setter: setEnergyLevel },
    { key: 'sport', label: t.indicators.sport.label, question: p.sport, setter: setSportLevel },
    { key: 'social', label: t.indicators.social.label, question: p.social, setter: setSocialLevel },
    { key: 'motivation', label: t.indicators.motivation.label, question: p.motivation, setter: setMotivationLevel },
    { key: 'focus', label: t.indicators.focus.label, question: p.concentration, setter: setConcentrationLevel },
    { key: 'emotional', label: t.indicators.emotional.label, question: p.emotional, setter: setRegulationLevel },
    { key: 'sleep', label: t.indicators.sleep.label, question: p.sleep, setter: setSleepQuality },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        voicesRef.current = synthRef.current?.getVoices() ?? [];
      };
      loadVoices();
      // Chrome/Edge cargan las voces async; hay que reescuchar.
      synthRef.current.addEventListener?.('voiceschanged', loadVoices);
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Orden de preferencia de locales por idioma. Para español priorizamos LatAm
  // (es-US es la variante "Spanish (United States)" — suele venir Paulina/Google
  // en español neutro latino).
  const LOCALE_PREFERENCE: Record<string, string[]> = {
    es: ['es-US', 'es-MX', 'es-419', 'es-CO', 'es-AR', 'es-CL', 'es-PE', 'es-VE', 'es-EC', 'es-PY', 'es-UY', 'es-BO', 'es-DO', 'es-GT', 'es-HN', 'es-NI', 'es-PA', 'es-PR', 'es-SV', 'es-CR', 'es-ES'],
  };

  // Keywords que indican voz de mayor calidad (neural/online/natural) o voces
  // latinas conocidas (Paulina/Jorge son de macOS/iOS con acento mexicano).
  const QUALITY_KEYWORDS = [
    'natural', 'neural', 'online', 'premium', 'enhanced',
    'google', 'paulina', 'jorge', 'juan', 'esperanza', 'dalia', 'helena',
  ];

  const pickVoice = (): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;

    const preferredLocales = LOCALE_PREFERENCE[language] ?? [language];
    const scoreVoice = (v: SpeechSynthesisVoice) => {
      const lower = `${v.name} ${v.voiceURI}`.toLowerCase();
      const localeIdx = preferredLocales.findIndex(loc => v.lang.toLowerCase().startsWith(loc.toLowerCase()));
      if (localeIdx === -1) return -1;
      const qualityBoost = QUALITY_KEYWORDS.some(k => lower.includes(k)) ? 100 : 0;
      // Locales al principio del array suman más.
      return 1000 - localeIdx + qualityBoost;
    };

    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const v of voices) {
      const s = scoreVoice(v);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    }
    if (best) return best;
    // Fallback: cualquier voz que empiece con el idioma.
    return voices.find(v => v.lang.toLowerCase().startsWith(language)) ?? voices[0] ?? null;
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }

      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // Si las voces todavía no cargaron, refrescamos.
      if (!voicesRef.current.length) {
        voicesRef.current = synthRef.current.getVoices();
      }
      const voice = pickVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = language === 'es' ? 'es-US' : 'en-US';
      }

      utterance.rate = 1.02;
      utterance.pitch = 1.05;

      utterance.onstart = () => {
        if (activeRef.current) setStatus('SPEAKING');
      };

      utterance.onend = () => {
        setTimeout(() => {
          if (activeRef.current) setStatus('IDLE');
          resolve();
        }, 200);
      };

      utterance.onerror = () => resolve();

      try {
        synthRef.current.speak(utterance);
      } catch (e) {
        resolve();
      }
    });
  };

  const listen = (retries = 1): Promise<string> => {
    return new Promise((resolve) => {
      if (!recognitionRef.current) { resolve(""); return; }

      try { recognitionRef.current.stop(); } catch (e) { }
      recognitionRef.current.lang = language === 'es' ? 'es-US' : 'en-US';

      setStatus('LISTENING');

      let finalResult = "";
      let hasResult = false;
      let ended = false;

      const finish = (result: string) => {
        if (ended) return;
        ended = true;
        clearTimeout(safetyTimeout);
        if (activeRef.current) setStatus('PROCESSING');
        resolve(result);
      };

      const safetyTimeout = setTimeout(() => {
        try { recognitionRef.current.stop(); } catch (e) { }
        if (!hasResult) {
          if (retries > 0 && activeRef.current) {
            ended = true;
            resolve(listen(retries - 1));
          } else {
            finish("");
          }
        }
      }, 8000);

      recognitionRef.current.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          finalResult = event.results[0][0].transcript;
          hasResult = true;
        }
      };

      recognitionRef.current.onerror = (e: any) => {
        console.warn("Recognition Error", e);
      };

      recognitionRef.current.onend = () => {
        if (!hasResult && retries > 0 && activeRef.current) {
          // Retry immediately instead of waiting for the safety timeout
          ended = true;
          clearTimeout(safetyTimeout);
          resolve(listen(retries - 1));
        } else {
          finish(finalResult);
        }
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        finish("");
      }
    });
  };

  const parseNumberInput = (text: string): number | null => {
    if (!text) return null;
    const clean = text.replace(/[.,!?;:]/g, "").toLowerCase().trim();

    const clampScale = (v: number) => {
      // Si dictan un número grande (ej: "70" en escala vieja) lo bajamos a 1-10.
      if (v > 10) v = Math.round(v / 10);
      return Math.min(10, Math.max(1, v));
    };

    const digitMatch = clean.match(/(\d+)/);
    if (digitMatch) {
      return clampScale(parseInt(digitMatch[0]));
    }

    const maps: Record<string, Record<string, number>> = {
      es: {
        'cero': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
        'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
      },
      en: {
        'zero': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      },
    };
    const map = maps[language === 'es' ? 'es' : 'en'] || maps.en;

    const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (clean.includes(key)) return map[key];
    }

    if (['excelente', 'perfect', 'perfecto', 'tope', 'maximo', 'máximo'].some(w => clean.includes(w))) return 10;
    if (['muy bien', 'very good', 'super', 'genial', 'great'].some(w => clean.includes(w))) return 9;
    if (['bien', 'good', 'fine', 'ok'].some(w => clean.includes(w))) return 7;
    if (['regular', 'so so', 'normal', 'medio', 'average'].some(w => clean.includes(w))) return 5;
    if (['mal', 'bad', 'canso', 'tired'].some(w => clean.includes(w))) return 3;
    if (['fatal', 'terrible', 'horrible'].some(w => clean.includes(w))) return 1;

    return null;
  };

  const parseBooleanInput = (text: string): boolean | null => {
    if (!text) return null;
    const clean = text.toLowerCase();

    if (['si', 'sí', 'yes', 'yeah', 'claro', 'hecho', 'done', 'listo', 'ok', 'completado', 'logrado', 'pude', 'ya', 'conseguido', 'seguro', 'por supuesto'].some(w => clean.includes(w))) return true;

    if (['no', 'nop', 'not', 'nunca', 'jamás', 'pendiente', 'falta', 'aun no', 'aún no', 'imposible', 'todavía', 'todavia'].some(w => clean.includes(w))) return false;

    return null;
  };

  const recordAudioNote = async (): Promise<void> => {
    if (!onStartAudioNote || !onStopAudioNote) return;

    setStatus('RECORDING');
    setFeedback(null);
    onStartAudioNote();

    const totalSeconds = Math.round(AUDIO_NOTE_DURATION_MS / 1000);
    const start = Date.now();

    // Countdown updated every 500ms; abortable via activeRef
    while (activeRef.current) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, totalSeconds - Math.floor(elapsed / 1000));
      setAudioCountdown(remaining);
      if (elapsed >= AUDIO_NOTE_DURATION_MS) break;
      await new Promise(r => setTimeout(r, 500));
    }

    setAudioCountdown(null);
    // onStopAudioNote resolves once the MediaRecorder stopped AND the blob
    // fue codificado a base64 y volcado al state en PersonalCanvas.
    await Promise.resolve(onStopAudioNote());
  };

  const runAssistantFlow = async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsActive(true);

    const metrics = getMetricsConfig();
    const queue: QuestionStep[] = [];

    metrics.forEach(m => {
      if (enabledMetrics.includes(m.key) && m.setter) {
        queue.push({ type: 'METRIC', id: m.key, label: m.label, question: m.question, setter: m.setter });
      }
    });

    const pendingGoals = goals?.filter(g => !g.completed) || [];
    if (pendingGoals.length > 0 && onUpdateGoal) {
      queue.push({ type: 'TRANSITION', label: 'Objetivos', question: p.goalsIntro || "Hablemos de tus objetivos." });

      pendingGoals.forEach(g => {
        queue.push({ type: 'GOAL', id: g.id, label: g.text, question: `${t.assistantPrompts.goalAsk} ${g.text}?` });
      });
    }

    // El diario textual se omite en el flujo por voz: la nota de audio del
    // día cubre la reflexión. Si el usuario no tiene grabación disponible
    // (sin handlers de audio), caemos al dictado de texto como fallback.
    const hasAudioStep = !!(onStartAudioNote && onStopAudioNote);
    if (setReflection && !hasAudioStep) {
      queue.push({ type: 'JOURNAL', label: 'Diario', question: p.journalAsk, setter: setReflection });
    }

    if (hasAudioStep) {
      queue.push({
        type: 'AUDIO_NOTE',
        label: 'Nota de voz',
        question: hasAudioNote
          ? ((p as any).audioNoteSkipped || 'A voice note already exists.')
          : ((p as any).audioNoteIntro || 'Record your voice note now.')
      });
    }

    const totalSteps = queue.length;

    for (let i = 0; i < totalSteps; i++) {
      if (!activeRef.current) break;

      const step = queue[i];
      setProgress(Math.round((i / totalSteps) * 100));
      setCurrentDisplay(step.label);
      setFeedback(null);

      await speak(step.question);
      if (!activeRef.current) break;

      if (step.type === 'TRANSITION') {
        continue;
      }

      if (step.type === 'AUDIO_NOTE') {
        if (hasAudioNote) {
          setFeedback('Mantenida');
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        await recordAudioNote();
        if (!activeRef.current) break;
        setStatus('SUCCESS');
        setFeedback((p as any).audioNoteSaved || 'Voice note saved.');
        await new Promise(r => setTimeout(r, 800));
        continue;
      }

      await new Promise(r => setTimeout(r, 200));
      const answer = await listen(1);

      if (!activeRef.current) break;

      if (!answer) {
        continue;
      }

      let valueRegistered = false;

      if (step.type === 'METRIC' && step.setter) {
        const val = parseNumberInput(answer);
        if (val !== null) {
          step.setter(val);
          setFeedback(`${(p as any).registered || 'Registered'}: ${val}`);
          valueRegistered = true;
        }
      } else if (step.type === 'GOAL' && onUpdateGoal && typeof step.id === 'number') {
        const val = parseBooleanInput(answer);
        if (val !== null) {
          onUpdateGoal(step.id, val);
          setFeedback(val ? 'Completado' : 'Pendiente');
          valueRegistered = true;
        }
      } else if (step.type === 'JOURNAL' && step.setter) {
        if (answer.length > 3) {
          const isNo = parseBooleanInput(answer) === false;
          if (!isNo) {
            step.setter((prev: string) => prev ? `${prev} ${answer}` : answer);
            setFeedback('Nota guardada');
            valueRegistered = true;
          }
        }
      }

      if (valueRegistered) {
        setStatus('SUCCESS');
        await new Promise(r => setTimeout(r, 800));
      }
    }

    if (activeRef.current) {
      setProgress(100);
      setCurrentDisplay("Guardando...");
      setStatus('PROCESSING');
      await speak(p.saving);
      if (onSaveRequest) {
        // Small delay to ensure all state setters have committed before save
        await new Promise(r => setTimeout(r, 150));
        onSaveRequest();
      }
      await new Promise(r => setTimeout(r, 1000));
      stop();
    }
  };

  const stop = () => {
    activeRef.current = false;
    setIsActive(false);
    synthRef.current?.cancel();
    try { recognitionRef.current?.stop(); } catch (e) { }
    // If user aborts mid-recording, stop the MediaRecorder too
    if (status === 'RECORDING' && onStopAudioNote) {
      try { onStopAudioNote(); } catch (e) { }
    }
    setStatus('IDLE');
    setCurrentDisplay("");
    setFeedback(null);
    setAudioCountdown(null);
  };

  if (!recognitionRef.current && typeof window !== 'undefined') return null;

  return (
    <div className="flex flex-col items-end gap-2">
      {isActive && (
        <div className="mb-2 bg-white rounded-2xl shadow-xl border border-indigo-100 p-4 w-64 animate-in slide-in-from-bottom-5 fade-in duration-300 relative overflow-hidden">

          <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-500 z-10" style={{ width: `${progress}%` }}></div>

          <div className="flex justify-between items-start mb-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{status === 'SUCCESS' ? 'HECHO' : status}</span>
            <span className="text-xs font-bold text-indigo-600">{audioCountdown !== null ? `${audioCountdown}s` : `${progress}%`}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`
                    p-2 rounded-full transition-colors duration-300
                    ${status === 'LISTENING' ? 'bg-red-100 text-red-500 animate-pulse' : ''}
                    ${status === 'SPEAKING' ? 'bg-indigo-50 text-indigo-600' : ''}
                    ${status === 'SUCCESS' ? 'bg-green-100 text-green-600 scale-110' : ''}
                    ${status === 'PROCESSING' ? 'bg-slate-100 text-slate-500' : ''}
                    ${status === 'RECORDING' ? 'bg-red-100 text-red-600 animate-pulse' : ''}
                 `}>
              {status === 'LISTENING' || status === 'RECORDING' ? <Mic size={20} /> :
                (status === 'SPEAKING' ? <Volume2 size={20} /> :
                  (status === 'SUCCESS' ? <Check size={20} strokeWidth={3} /> : <RefreshCw size={20} className="animate-spin" />))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                {currentDisplay || "Iniciando..."}
              </p>
              {feedback && (
                <p className="text-xs font-bold text-green-600 mt-1 animate-in slide-in-from-left-2 fade-in">
                  {feedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={isActive ? stop : runAssistantFlow}
        className={`
          flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all transform active:scale-95 border-2 z-50
          ${isActive
            ? 'bg-white border-red-500 text-red-500 hover:bg-red-50'
            : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 hover:scale-110'
          }
        `}
      >
        {isActive ? <StopCircle size={24} className="fill-current" /> : <Mic size={24} />}
      </button>
    </div>
  );
};

export default AppGuideAssistant;
