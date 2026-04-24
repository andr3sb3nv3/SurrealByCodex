import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, Activity, Calendar, CheckCircle2, Moon, Sun, Circle, 
  Lightbulb, Smile, Zap, Users, Flame, Brain, Scale, BookOpen, 
  RotateCcw, MessageSquare, Save, Camera, Loader2, X, Dumbbell, Info, ChevronDown,
  Trash2, Plus, EyeOff, LogOut, Edit3, Settings, ToggleLeft, ToggleRight, Mic, Square, Play, Pause, Lock
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import CompanyHeader from '../components/CompanyHeader';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import AppGuideAssistant from '../components/AppGuideAssistant';
import DetoxTracker from '../components/DetoxTracker';
import PatologiaSection from '../components/PatologiaSection';
import { formatDateFriendly, getTodayKey } from '../utils/dateUtils';
import { CanvasProps, Goal, ResourceData } from '../types';
import { RESOURCES_DB } from '../constants';
import { TRANSLATIONS } from '../translations';
import { useToast } from '../utils/useToast';
import { METRIC_MIN, METRIC_MAX, METRIC_DEFAULT, normalizeMetric } from '../utils/metricScale';

// Hex codes mapping for slider gradients matching Tailwind classes
const METRIC_COLORS: Record<string, string> = {
  mood: '#ec4899', // pink-500
  energy: '#f59e0b', // amber-500
  sport: '#10b981', // emerald-500
  social: '#14b8a6', // teal-500
  motivation: '#f97316', // orange-500
  focus: '#8b5cf6', // violet-500
  emotional: '#0ea5e9', // sky-500
  sleep: '#6366f1', // indigo-500
};

const PersonalCanvas: React.FC<CanvasProps> = ({ 
  onNavigateToDashboard, onNavigateToComments, currentDate, 
  onDateChange, user, authUser, onAuthRequest, onNavigateToProfile,
  language, onToggleLanguage, isPro, onTogglePro, theme,
  readOnly, viewingFriendName, onExitSharedView, onLogout,
  showDevControls = true
}) => {
  const t = TRANSLATIONS[language];
  
  // ALL AVAILABLE METRICS CONFIGURATION
  const ALL_METRICS = useMemo(() => [
    { key: 'mood', icon: Smile, label: t.indicators.mood.label, color: 'text-pink-500', accent: 'accent-pink-500', desc: t.indicators.mood.desc },
    { key: 'energy', icon: Zap, label: t.indicators.energy.label, color: 'text-amber-500', accent: 'accent-amber-500', desc: t.indicators.energy.desc },
    { key: 'sport', icon: Dumbbell, label: t.indicators.sport.label, color: 'text-emerald-500', accent: 'accent-emerald-500', desc: t.indicators.sport.desc },
    { key: 'social', icon: Users, label: t.indicators.social.label, color: 'text-teal-500', accent: 'accent-teal-500', desc: t.indicators.social.desc },
    { key: 'motivation', icon: Flame, label: t.indicators.motivation.label, color: 'text-orange-500', accent: 'accent-orange-500', desc: t.indicators.motivation.desc },
    { key: 'focus', icon: Brain, label: t.indicators.focus.label, color: 'text-violet-500', accent: 'accent-violet-500', desc: t.indicators.focus.desc },
    { key: 'emotional', icon: Scale, label: t.indicators.emotional.label, color: 'text-sky-500', accent: 'accent-sky-500', desc: t.indicators.emotional.desc },
    { key: 'sleep', icon: Moon, label: t.indicators.sleep.label, color: 'text-indigo-500', accent: 'accent-indigo-500', desc: t.indicators.sleep.desc },
  ], [t]);

  // State for Visible Metrics (IDs of enabled metrics)
  const [enabledMetrics, setEnabledMetrics] = useState<string[]>(ALL_METRICS.map(m => m.key));
  const [showMetricSettings, setShowMetricSettings] = useState(false);

  // Initialize empty to avoid flickering generic goals for logged in users
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);

  const [reflection, setReflection] = useState("");
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [dataEncryptedButNoKey, setDataEncryptedButNoKey] = useState(false);
  
  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>("audio/webm");
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Resuelve cuando el blob fue codificado a base64 y audioNote quedó seteado.
  // Permite que el flujo por voz espere la codificación antes de disparar el guardado.
  const audioEncodedResolverRef = useRef<(() => void) | null>(null);

  // Metric States
  const [mood, setMood] = useState(METRIC_DEFAULT);
  const [sleepQuality, setSleepQuality] = useState(METRIC_DEFAULT);
  const [energyLevel, setEnergyLevel] = useState(METRIC_DEFAULT);
  const [sportLevel, setSportLevel] = useState(METRIC_DEFAULT);
  const [socialLevel, setSocialLevel] = useState(METRIC_DEFAULT);
  const [motivationLevel, setMotivationLevel] = useState(METRIC_DEFAULT);
  const [concentrationLevel, setConcentrationLevel] = useState(METRIC_DEFAULT);
  const [regulationLevel, setRegulationLevel] = useState(METRIC_DEFAULT);

  const [activeResource, setActiveResource] = useState<ResourceData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Editing Goals State
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");

  // AUTO-SAVE TRIGGER (Fix for Voice Assistant Stale Closure)
  const [triggerAutoSave, setTriggerAutoSave] = useState(false);

  // Mapping state setters for dynamic rendering
  const METRIC_STATE_MAP: Record<string, { value: number, setValue: (val: number) => void }> = {
    mood: { value: mood, setValue: setMood },
    energy: { value: energyLevel, setValue: setEnergyLevel },
    sport: { value: sportLevel, setValue: setSportLevel },
    social: { value: socialLevel, setValue: setSocialLevel },
    motivation: { value: motivationLevel, setValue: setMotivationLevel },
    focus: { value: concentrationLevel, setValue: setConcentrationLevel },
    emotional: { value: regulationLevel, setValue: setRegulationLevel },
    sleep: { value: sleepQuality, setValue: setSleepQuality },
  };

  const isToday = useMemo(() => currentDate === getTodayKey(), [currentDate]);

  const isGuest = !user || user.isAnonymous;

  // Cleanup audio on unmount or date change
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setIsPlaying(false);
    };
  }, [currentDate]);

  // Load User Preferences (Enabled Metrics)
  useEffect(() => {
    const loadPreferences = async () => {
      if (user && !user.isAnonymous && db) {
        try {
          const prefRef = doc(db, 'users', user.uid, 'user_settings', 'preferences');
          const snap = await getDoc(prefRef);
          if (snap.exists() && snap.data().enabledMetrics) {
            setEnabledMetrics(snap.data().enabledMetrics);
          }
        } catch (e) {
          console.warn("Failed to load metric preferences", e);
        }
      } else {
        // Guest: Try LocalStorage
        const saved = localStorage.getItem('guest_metrics_pref');
        if (saved) {
          try {
            setEnabledMetrics(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    loadPreferences();
  }, [user]);

  // Save Preferences
  const savePreferences = async (newMetrics: string[]) => {
    setEnabledMetrics(newMetrics);
    
    if (user && !user.isAnonymous && db) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'user_settings', 'preferences'), {
           enabledMetrics: newMetrics,
           updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error("Error saving preferences", e);
      }
    } else {
      localStorage.setItem('guest_metrics_pref', JSON.stringify(newMetrics));
    }
    
    setShowMetricSettings(false);
    showToast("Preferencias actualizadas", 'success');
  };

  useEffect(() => {
    const loadDay = async () => {
      setIsLoadingGoals(true);
      setDataEncryptedButNoKey(false);
      // Stop any playing audio when switching days
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
        setIsPlaying(false);
      }

      // 1. Guest Logic
      if (!user) {
         setGoals([]); // Start with empty goals for guest, same as new user
         // Reset metrics for guest interaction
         setReflection("");
         setAudioNote(null);
         setMood(METRIC_DEFAULT);
         setEnergyLevel(METRIC_DEFAULT);
         setSportLevel(METRIC_DEFAULT);
         setSleepQuality(METRIC_DEFAULT);
         setSocialLevel(METRIC_DEFAULT);
         setMotivationLevel(METRIC_DEFAULT);
         setConcentrationLevel(METRIC_DEFAULT);
         setRegulationLevel(METRIC_DEFAULT);
         setIsLoadingGoals(false);
         return;
      }

      try {
        if (!db) throw new Error("No db");
        
        // 2. Try to load specific Daily Log
        const dailyLogRef = doc(db, 'users', user.uid, 'daily_logs', currentDate);
        const docSnap = await getDoc(dailyLogRef);

        if (docSnap.exists()) {
          // --- EXISTING DAY RECORD ---
          const d = docSnap.data();
          
          setMood(normalizeMetric(d.estado_animo));
          setEnergyLevel(normalizeMetric(d.nivel_energia));
          setSportLevel(normalizeMetric(d.nivel_deporte));
          setSleepQuality(normalizeMetric(d.calidad_sueno));
          setSocialLevel(normalizeMetric(d.social_confort));
          setMotivationLevel(normalizeMetric(d.nivel_motivacion));
          setConcentrationLevel(normalizeMetric(d.nivel_concentracion));
          setRegulationLevel(normalizeMetric(d.regulacion_emocional));
          
          setReflection(d.reflexion || "");
          setAudioNote(d.audio_note || null);
          
          const completedTasks = d.objetivos_completados || [];
          const pendingTasks = d.objetivos_pendientes || [];

          const reconstructedGoals: Goal[] = [];

          const createGoalObj = (t: any, isCompleted: boolean) => ({
            id: Math.random(),
            text: t.tarea,
            category: t.categoria || 'General',
            completed: isCompleted,
            resourceKey: 'general'
          });

          pendingTasks.forEach((t: any) => reconstructedGoals.push(createGoalObj(t, false)));
          completedTasks.forEach((t: any) => reconstructedGoals.push(createGoalObj(t, true)));

          setGoals(reconstructedGoals);

        } else {
          // --- NO RECORD FOR THIS DAY (NEW DAY) ---
          setReflection("");
          setAudioNote(null);
          setMood(METRIC_DEFAULT);
          setEnergyLevel(METRIC_DEFAULT);
          setSportLevel(METRIC_DEFAULT);
          setSleepQuality(METRIC_DEFAULT);
          setSocialLevel(METRIC_DEFAULT);
          setMotivationLevel(METRIC_DEFAULT);
          setConcentrationLevel(METRIC_DEFAULT);
          setRegulationLevel(METRIC_DEFAULT);

          // Load Goal Template from Set_goals
          const goalsTemplateRef = doc(db, 'users', user.uid, 'Set_goals', 'current');
          try {
            const templateSnap = await getDoc(goalsTemplateRef);
            if (templateSnap.exists()) {
              const templateData = templateSnap.data();
              const templateGoals = templateData.goals || [];
              
              const freshGoals = templateGoals.map((g: Goal) => ({
                ...g,
                completed: false,
                id: Date.now() + Math.random()
              }));
              setGoals(freshGoals);
            } else {
              setGoals([]);
            }
          } catch (templateErr) {
            console.warn("Could not load template goals", templateErr);
            setGoals([]);
          }
        }
      } catch(e) { 
        console.error(e); 
      } finally {
        setIsLoadingGoals(false);
      }
    };
    loadDay();
  }, [currentDate, user]);

  const toggleGoal = (id: number) => {
    if (readOnly) return;
    setGoals(goals.map(goal => goal.id === id ? { ...goal, completed: !goal.completed } : goal));
  };

  const handleUpdateGoalStatus = (id: number, status: boolean) => {
     if (readOnly) return;
     setGoals(prev => prev.map(goal => goal.id === id ? { ...goal, completed: status } : goal));
  };

  const handleAddGoal = () => {
    if (readOnly) return;
    if (!newGoalText.trim()) return;
    const newGoal: Goal = {
      id: Date.now(),
      text: newGoalText.trim(),
      category: "General",
      completed: false,
      resourceKey: "general"
    };
    setGoals([...goals, newGoal]);
    setNewGoalText("");
  };

  const handleDeleteGoal = (id: number) => {
    if (readOnly) return;
    setGoals(goals.filter(g => g.id !== id));
  };

  const toggleEditGoals = () => {
    if (readOnly) return;
    if (isEditingGoals) {
      if (!isGuest) {
        saveDailyRecord();
      }
    }
    setIsEditingGoals(!isEditingGoals);
  };

  const openResource = (goal: Goal) => {
    const key = goal.resourceKey || 'general';
    const resourceData = RESOURCES_DB[key] || RESOURCES_DB['general'];
    if (key === 'reading' && Array.isArray(resourceData)) {
      const randomBook = resourceData[Math.floor(Math.random() * resourceData.length)];
      setActiveResource({ task: goal.text, type: 'book_recommendation', data: randomBook });
    } else if (Array.isArray(resourceData)) {
      setActiveResource({ task: goal.text, type: 'list', data: resourceData });
    } else {
      setActiveResource({ task: goal.text, type: 'tip', data: resourceData });
    }
  };

  // Recording Logic
  const handleStartRecording = async () => {
    if (readOnly) return;
    // Stop playing if user starts recording
    if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
        setIsPlaying(false);
    }

    try {
      // Check permission state upfront so we can give a clearer message if
      // the user previously blocked the mic. The Permissions API returns
      // 'granted' | 'prompt' | 'denied' and is remembered by the browser.
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (status.state === 'denied') {
            showToast("El micrófono está bloqueado. Activá el permiso desde el candado de la barra de direcciones.", 'error');
            return;
          }
        } catch {
          // Some browsers (Firefox) don't support querying 'microphone' — ignore and fall through.
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeTypes = [
        'audio/webm;codecs=opus', 
        'audio/webm', 
        'audio/mp4', 
        'audio/aac',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
        }
      }
      
      if (!selectedMimeType) {
         selectedMimeType = 'audio/webm';
      }
      
      recordingMimeTypeRef.current = selectedMimeType;
      
      const options: MediaRecorderOptions = selectedMimeType && MediaRecorder.isTypeSupported(selectedMimeType) 
        ? { 
            mimeType: selectedMimeType,
            bitsPerSecond: 64000 
          } 
        : {};

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeTypeRef.current });
        const reader = new FileReader();
        const resolveEncoded = () => {
          if (audioEncodedResolverRef.current) {
            audioEncodedResolverRef.current();
            audioEncodedResolverRef.current = null;
          }
        };
        reader.onloadend = () => {
          const base64String = reader.result as string;
          if (base64String.length > 1000000) {
            showToast("Audio demasiado largo para guardar (>1MB). Intenta menos de 1 min.", 'error');
          } else {
            setAudioNote(base64String);
          }
          resolveEncoded();
        };
        reader.onerror = () => resolveEncoded();
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
            showToast("Tiempo máximo (60s) alcanzado.", 'warning');
        }
      }, 60000);

    } catch (err: any) {
      console.error(err);
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        showToast("Bloqueaste el acceso al micrófono. Podés reactivarlo desde el candado de la barra de direcciones.", 'error');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        showToast("No encontramos ningún micrófono en este dispositivo.", 'error');
      } else {
        showToast(t.audio.permissionError, 'error');
      }
    }
  };

  const handleStopRecording = (): Promise<void> => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    // Leemos el estado del propio MediaRecorder para no depender del closure
    // de `isRecording` (el asistente por voz captura este handler antes de
    // que React committee el setIsRecording(true), y se quedaba con el
    // valor stale → el early-return dejaba la grabación activa).
    if (!recorder || recorder.state !== 'recording') {
      setIsRecording(false);
      return Promise.resolve();
    }
    // La promesa resuelve recién cuando onstop + FileReader terminaron.
    // Safety: 5 s de timeout por si el reader nunca dispara onloadend.
    return new Promise<void>(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      audioEncodedResolverRef.current = finish;
      setTimeout(finish, 5000);
      recorder.stop();
      setIsRecording(false);
    });
  };

  const handleDeleteAudio = () => {
    if (readOnly) return;
    if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
    }
    setIsPlaying(false);
    setAudioNote(null);
  };

  const handleToggleAudio = () => {
    if (!audioNote) return;

    if (isPlaying && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
    } else {
        if (!audioPlayerRef.current) {
            const audio = new Audio(audioNote);
            audio.onended = () => setIsPlaying(false);
            audioPlayerRef.current = audio;
        }
        audioPlayerRef.current.play().catch(e => console.error("Playback error", e));
        setIsPlaying(true);
    }
  };


  const saveDailyRecord = async () => {
    if (isGuest || readOnly) return; 

    setIsSaving(true);

    const reflectionToSave = reflection;
    const audioToSave = audioNote;

    const exportObject: any = {
      fecha: currentDate,
      timestamp: Date.now(),
      reflexion: reflectionToSave,
      audio_note: audioToSave || null,
      progreso_porcentaje: goals.length > 0 ? Math.round((goals.filter(g => g.completed).length / goals.length) * 100) : 0,
      objetivos_completados: goals.filter(g => g.completed).map(g => ({ tarea: g.text, categoria: g.category })),
      objetivos_pendientes: goals.filter(g => !g.completed).map(g => ({ tarea: g.text, categoria: g.category })),
      isEncrypted: false
    };

    if (enabledMetrics.includes('mood')) exportObject.estado_animo = mood;
    if (enabledMetrics.includes('energy')) exportObject.nivel_energia = energyLevel;
    if (enabledMetrics.includes('sport')) exportObject.nivel_deporte = sportLevel;
    if (enabledMetrics.includes('sleep')) exportObject.calidad_sueno = sleepQuality;
    if (enabledMetrics.includes('social')) exportObject.social_confort = socialLevel;
    if (enabledMetrics.includes('motivation')) exportObject.nivel_motivacion = motivationLevel;
    if (enabledMetrics.includes('focus')) exportObject.nivel_concentracion = concentrationLevel;
    if (enabledMetrics.includes('emotional')) exportObject.regulacion_emocional = regulationLevel;

    try {
      if (!db) throw new Error("No db");
      
      await setDoc(doc(db, 'users', user!.uid, 'daily_logs', currentDate), exportObject, { merge: true });

      try {
        const templateObject = {
          updatedAt: Date.now(),
          goals: goals.map(g => ({ ...g, completed: false }))
        };
        await setDoc(doc(db, 'users', user!.uid, 'Set_goals', 'current'), templateObject);
      } catch (templateError) {
        console.warn("Template save skipped (permission or network):", templateError);
      }

      showToast(t.saved, 'success');
    } catch (e) {
      console.error("Save Error:", e);
      showToast(t.error, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (triggerAutoSave) {
      saveDailyRecord();
      setTriggerAutoSave(false);
    }
  }, [triggerAutoSave]);


  const handleReset = async () => {
    setMood(METRIC_DEFAULT);
    setEnergyLevel(METRIC_DEFAULT);
    setSportLevel(METRIC_DEFAULT);
    setSleepQuality(METRIC_DEFAULT);
    setSocialLevel(METRIC_DEFAULT);
    setMotivationLevel(METRIC_DEFAULT);
    setConcentrationLevel(METRIC_DEFAULT);
    setRegulationLevel(METRIC_DEFAULT);
    setReflection("");
    setAudioNote(null);
    if(audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
        setIsPlaying(false);
    }

    const resetGoals = goals.map(g => ({...g, completed: false}));
    setGoals(resetGoals);

    if (!isGuest && user && !readOnly) {
      try {
        const exportObject: any = {
          fecha: currentDate,
          timestamp: Date.now(),
          reflexion: "",
          audio_note: null,
          progreso_porcentaje: 0,
          objetivos_completados: [],
          objetivos_pendientes: resetGoals.map(g => ({ tarea: g.text, categoria: g.category })),
          isEncrypted: false
        };

        if (enabledMetrics.includes('mood')) exportObject.estado_animo = METRIC_DEFAULT;
        if (enabledMetrics.includes('energy')) exportObject.nivel_energia = METRIC_DEFAULT;
        if (enabledMetrics.includes('sport')) exportObject.nivel_deporte = METRIC_DEFAULT;
        if (enabledMetrics.includes('sleep')) exportObject.calidad_sueno = METRIC_DEFAULT;
        if (enabledMetrics.includes('social')) exportObject.social_confort = METRIC_DEFAULT;
        if (enabledMetrics.includes('motivation')) exportObject.nivel_motivacion = METRIC_DEFAULT;
        if (enabledMetrics.includes('focus')) exportObject.nivel_concentracion = METRIC_DEFAULT;
        if (enabledMetrics.includes('emotional')) exportObject.regulacion_emocional = METRIC_DEFAULT;

        await setDoc(doc(db, 'users', user.uid, 'daily_logs', currentDate), exportObject, { merge: true });
      } catch (e) {
        console.error("Error resetting DB:", e);
      }
    }

    setShowResetConfirm(false);
    showToast(t.resetDay, 'success');
  };

  const handleToggleMetric = (key: string) => {
    if (enabledMetrics.includes(key)) {
      if (enabledMetrics.length > 1) {
        setEnabledMetrics(prev => prev.filter(k => k !== key));
      } else {
        showToast("Debes mantener al menos una métrica", "error");
      }
    } else {
      setEnabledMetrics(prev => [...prev, key]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans p-4 md:p-8 pb-32 relative transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      
      <Modal 
        isOpen={showMetricSettings} 
        title="Personalizar Métricas" 
        onCancel={() => setShowMetricSettings(false)} 
        onConfirm={() => savePreferences(enabledMetrics)} 
        confirmText="Guardar Cambios"
        cancelText="Cancelar"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
          {ALL_METRICS.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => handleToggleMetric(m.key)}
              aria-pressed={enabledMetrics.includes(m.key)}
              className={`w-full text-left p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                enabledMetrics.includes(m.key)
                  ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${enabledMetrics.includes(m.key) ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <m.icon size={18} className={enabledMetrics.includes(m.key) ? m.color : 'text-slate-400 dark:text-slate-500'} />
                </div>
                <span className={`text-sm font-bold ${enabledMetrics.includes(m.key) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{m.label}</span>
              </div>
              
              {enabledMetrics.includes(m.key) ? (
                 <ToggleRight size={24} className="text-indigo-600 dark:text-indigo-400" />
              ) : (
                 <ToggleLeft size={24} className="text-slate-300 dark:text-slate-600" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showResetConfirm} title={t.resetDay + "?"} onCancel={() => setShowResetConfirm(false)} onConfirm={handleReset} confirmText={t.resetDay}>
        ...
      </Modal>

      {activeResource && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <button onClick={() => setActiveResource(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={20} /></button>
            <div className="mb-6 flex items-center gap-3"><div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full"><Lightbulb size={24} /></div><div><h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ayuda</h3><p className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{activeResource.task}</p></div></div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-5 border border-slate-100 dark:border-slate-700">
              {activeResource.type === 'book_recommendation' && !Array.isArray(activeResource.data) && (<div className="text-center"><h4 className="font-bold text-slate-900 dark:text-white">"{activeResource.data.title}"</h4><a href={activeResource.data.url} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline mt-2 block">Leer Ahora</a></div>)}
              {activeResource.type === 'list' && Array.isArray(activeResource.data) && activeResource.data.map((i, k) => <a key={k} href={i.url} target="_blank" rel="noreferrer" className="block p-2 bg-white dark:bg-slate-800 mb-2 border dark:border-slate-600 rounded text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">{i.title}</a>)}
              {activeResource.type === 'tip' && !Array.isArray(activeResource.data) && <p className="italic text-slate-700 dark:text-slate-300">"{activeResource.data.tip}"</p>}
            </div>
          </div>
        </div>
      )}

      <CompanyHeader onAuthClick={onAuthRequest} user={authUser} onProfileClick={onNavigateToProfile} language={language} onToggleLanguage={onToggleLanguage} isPro={isPro} onLogout={onLogout} />

      {/* READ ONLY BANNER */}
      {readOnly && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 sticky top-[73px] z-30 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold">
              <EyeOff size={16} />
              <span>{t.viewingProfileOf} {viewingFriendName} ({t.readOnlyMode})</span>
            </div>
            <button 
              onClick={onExitSharedView}
              className="flex items-center gap-2 bg-amber-200/50 hover:bg-amber-200 dark:bg-amber-700/50 dark:hover:bg-amber-700 px-3 py-1 rounded-full text-xs font-bold transition-colors"
            >
              <LogOut size={12} /> {t.exitSharedView}
            </button>
          </div>
        </div>
      )}

      {!isToday && !readOnly && <div className="bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-200 px-4 py-2 text-center text-sm font-bold flex justify-center items-center gap-2 sticky top-[73px] z-20"><Clock size={16} /> {t.editingMode} {formatDateFriendly(currentDate, language)}</div>}

      {/* MODERN DATE HEADER */}
      <header className={`max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6 ${readOnly ? 'mt-8' : 'mt-8'}`}>
        
        {/* Date Selection - Compact Pill Design */}
        <div className="relative group">
          <input 
            type="date" 
            value={currentDate} 
            onChange={(e) => onDateChange(e.target.value)} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          />
          
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 pl-1.5 pr-4 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 group-hover:shadow-md group-hover:border-indigo-300 dark:group-hover:border-indigo-600 transition-all duration-300 transform group-hover:-translate-y-0.5 cursor-pointer">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-full">
              <Calendar size={16} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none capitalize">
                {formatDateFriendly(currentDate, language, false)}
              </h1>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
        </div>

      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="contents md:flex md:flex-col md:col-span-8 md:gap-6">
          {/* Indicators Guide */}
          <div className="order-1 md:order-none bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all duration-300">
            <button 
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="w-full flex justify-between items-center group outline-none"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="text-indigo-600 dark:text-indigo-400" size={24} />
                {t.guideTitle}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {!isGuideOpen && <span>{t.viewDetails}</span>}
                <ChevronDown size={20} className={`transition-transform duration-300 ${isGuideOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            {isGuideOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 animate-in slide-in-from-top-2 fade-in duration-300">
                {ALL_METRICS.filter(m => enabledMetrics.includes(m.key)).map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <item.icon size={18} className={item.color} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detox Tracker Section */}
          <div className="order-2 md:order-none">
            <DetoxTracker user={user} language={language} readOnly={readOnly} />
          </div>

          <div className="order-3 md:order-none bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><CheckCircle2 className="text-green-500" /> {t.goalsTitle} {isToday ? t.goalsToday : `${t.goalsOf} ${formatDateFriendly(currentDate, language)}`}</h2>
              {(goals.length > 0 || isEditingGoals) && !readOnly && (
                <button 
                  onClick={toggleEditGoals}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                >
                  {isEditingGoals ? t.finishEdit : t.edit}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {/* New Goal Input */}
              {isEditingGoals && !readOnly && (
                <div className="flex gap-2 mb-4 animate-in fade-in bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner">
                   <input 
                     type="text" 
                     value={newGoalText}
                     onChange={(e) => setNewGoalText(e.target.value)}
                     placeholder={t.newGoalPlaceholder}
                     className="flex-1 p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                     onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                   />
                   <button 
                    onClick={handleAddGoal} 
                    disabled={!newGoalText.trim()}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                   >
                     <Plus size={20} />
                   </button>
                </div>
              )}

              {isLoadingGoals ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                   <Loader2 className="animate-spin text-indigo-400" size={32} />
                   <p className="text-xs font-medium">{t.loading}</p>
                </div>
              ) : (
                <>
                  {goals.length === 0 && !isEditingGoals && (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-700/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t.startJourney}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-6">{t.noGoalsDesc}</p>
                      {!readOnly && (
                          <button 
                            onClick={() => setIsEditingGoals(true)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                          >
                            <Plus size={20} />
                            {t.createFirstGoal}
                          </button>
                      )}
                    </div>
                  )}

                  {goals.map(g => (
                    <div key={g.id} className={`flex justify-between items-center p-3 rounded-xl border ${g.completed && !isEditingGoals ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                      {isEditingGoals ? (
                        <div className="flex gap-3 items-center flex-1">
                          <button onClick={() => handleDeleteGoal(g.id)} className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800 transition-colors">
                            <Trash2 size={16} />
                          </button>
                          <span className="text-slate-700 dark:text-slate-200 font-medium">{g.text}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => toggleGoal(g.id)}
                          aria-pressed={g.completed}
                          className={`flex gap-3 items-center flex-1 text-left ${!readOnly ? 'cursor-pointer' : 'cursor-default'} focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg`}
                        >
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${g.completed ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500'}`}>{g.completed ? <CheckCircle2 size={20} /> : (g.text.toLowerCase().includes('cama') || g.text.toLowerCase().includes('dormir') ? <Moon size={18} /> : (g.text.toLowerCase().includes('despertar') || g.text.toLowerCase().includes('alarma') ? <Sun size={18} /> : <Circle size={20} />))}</span>
                          <span className={`${g.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>{g.text}</span>
                        </button>
                      )}
                      
                      {!isEditingGoals && !readOnly && (
                          <div className="flex gap-1"><button onClick={(e) => {e.stopPropagation(); openResource(g)}} className="p-2 text-cyan-500 hover:text-cyan-600"><Lightbulb size={18}/></button></div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Clinical modules auto-activated from the 10-digit code in the username. */}
          {user && (
            <PatologiaSection
              user={user}
              dateKey={currentDate}
              readOnly={!!readOnly}
              language={language}
            />
          )}

          {/* Detox Tracker Section was here */}
        </div>

        <div className="contents md:flex md:flex-col md:col-span-4 md:gap-6">
          <div className={`order-2 md:order-none bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
            
            {/* Header with Settings Icon */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas Diarias</span>
               {!readOnly && (
                 <button 
                   onClick={() => setShowMetricSettings(true)}
                   className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                   title="Personalizar métricas"
                 >
                   <Settings size={14} />
                 </button>
               )}
            </div>
            
            {/* Dynamic Rendering of Enabled Metrics */}
            {ALL_METRICS.filter(m => enabledMetrics.includes(m.key)).map((metric) => {
               const stateData = METRIC_STATE_MAP[metric.key];
               const color = METRIC_COLORS[metric.key] || '#6366f1';
               const val = stateData.value;
               const fillPct = ((val - METRIC_MIN) / (METRIC_MAX - METRIC_MIN)) * 100;
               const backgroundStyle = `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, ${theme === 'dark' ? '#334155' : '#e2e8f0'} ${fillPct}%, ${theme === 'dark' ? '#334155' : '#e2e8f0'} 100%)`;

               return (
                  <div key={metric.key} className="animate-in fade-in duration-300">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1 flex items-center gap-2">
                      <metric.icon size={14} className={metric.color}/>
                      {metric.label}: {stateData.value}/{METRIC_MAX}
                    </h3>
                    <input
                      disabled={readOnly}
                      type="range"
                      min={METRIC_MIN}
                      max={METRIC_MAX}
                      step={1}
                      value={stateData.value}
                      onChange={(e) => stateData.setValue(Number(e.target.value))} 
                      style={{ background: backgroundStyle }}
                      className={`
                        w-full h-2 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(148,163,184,0.3),0_2px_4px_rgba(0,0,0,0.1)]
                        [&::-webkit-slider-thumb]:transition-all
                        [&::-webkit-slider-thumb]:hover:scale-110
                        
                        [&::-moz-range-thumb]:w-6
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-none
                        [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(148,163,184,0.3),0_2px_4px_rgba(0,0,0,0.1)]
                        [&::-moz-range-thumb]:transition-all
                        [&::-moz-range-thumb]:hover:scale-110
                      `} 
                    />
                  </div>
               );
            })}
          </div>
          
          <div className="order-4 md:order-none bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center">
             <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mic size={16} className="text-indigo-500"/> {t.audio.voiceNoteTitle}
             </h3>

             {!readOnly && (
                <div className="flex flex-col items-center justify-center py-2 animate-in fade-in">
                    {!isRecording && !audioNote && (
                       <button 
                         onClick={handleStartRecording} 
                         className="group flex flex-col items-center transition-all transform hover:scale-105 active:scale-95"
                         title={t.audio.record}
                       >
                           <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 mb-2 transition-colors shadow-sm border border-indigo-100 dark:border-indigo-800">
                               <Mic size={24} />
                           </div>
                           <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-700">{t.audio.tapToRecord}</span>
                       </button>
                    )}

                    {isRecording && (
                       <div className="flex flex-col items-center">
                           <button 
                             onClick={handleStopRecording} 
                             className="w-16 h-16 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full flex items-center justify-center text-red-500 hover:text-red-600 mb-2 transition-colors animate-pulse border border-red-100 dark:border-red-800"
                             title={t.audio.stop}
                           >
                               <Square size={24} className="fill-current"/>
                           </button>
                           <span className="text-xs font-bold text-red-500">{t.audio.recording}</span>
                       </div>
                    )}

                    {audioNote && (
                        <div className="w-full bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                           <button 
                             onClick={handleToggleAudio} 
                             className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600 transition-colors"
                           >
                             {isPlaying ? <Pause size={16} className="fill-current"/> : <Play size={16} className="fill-current"/>} 
                             {isPlaying ? "Pausar" : t.audio.play}
                           </button>
                           <button 
                             onClick={handleDeleteAudio} 
                             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                             title={t.audio.delete}
                           >
                             <Trash2 size={18}/>
                           </button>
                        </div>
                    )}
                </div>
             )}

             {readOnly && (
               <div className="py-4 text-center">
                  {audioNote ? (
                     <button 
                       onClick={handleToggleAudio} 
                       className="mx-auto flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800"
                     >
                        {isPlaying ? <Pause size={16} className="fill-current"/> : <Play size={16} className="fill-current"/>} 
                        {isPlaying ? "Pausar" : t.audio.play}
                     </button>
                  ) : (
                     <span className="text-xs text-slate-400 italic">No audio recorded</span>
                  )}
               </div>
             )}
          </div>

          <div className="order-6 md:order-none bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800/50 flex-1">
            <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-cyan-800 dark:text-cyan-300 flex gap-2"><BookOpen size={18}/> Diario</h2>
            </div>
            <textarea disabled={readOnly} className="w-full h-24 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 text-sm placeholder:text-cyan-700/50 dark:placeholder:text-cyan-500/50" value={reflection} onChange={e => setReflection(e.target.value)} placeholder={isToday ? t.journalPlaceholder : `${t.journalPastPlaceholder} ${formatDateFriendly(currentDate, language)}?`} />
          </div>

          <div className="order-7 md:order-none bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            {isToday && !readOnly ? (
              <button onClick={() => setShowResetConfirm(true)} className="w-full text-xs text-slate-400 flex justify-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 font-medium py-2"><RotateCcw size={12}/> {t.resetDay}</button>
            ) : (
              <button onClick={onNavigateToComments} className="w-full text-xs text-indigo-600 dark:text-indigo-400 flex justify-center gap-1 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium py-2"><MessageSquare size={12}/> {t.viewComments}</button>
            )}
          </div>
        </div>
      </main>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-100 dark:from-slate-900 via-slate-100/90 dark:via-slate-900/90 to-transparent pointer-events-none flex justify-center items-center gap-3 z-40">
          <button
            onClick={saveDailyRecord}
            disabled={isSaving || isGuest}
            title={isGuest ? "Regístrate para guardar" : ""}
            className={`pointer-events-auto shadow-2xl flex items-center gap-2 px-8 py-3 rounded-full text-lg font-bold text-white transition-all transform hover:scale-105 active:scale-95 hover:shadow-orange-500/20 ${isToday ? 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100' : 'bg-orange-600 hover:bg-orange-700'} ${isSaving ? 'opacity-80 cursor-wait' : ''} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{t.save}</span>
          </button>

          <button
            onClick={onNavigateToDashboard}
            disabled={isGuest}
            title={isGuest ? "Regístrate para ver estadísticas" : ""}
            className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-violet-100 dark:bg-violet-900/40 backdrop-blur-md border border-violet-200 dark:border-violet-700/50 text-violet-900 dark:text-violet-200 rounded-full text-lg font-bold shadow-xl hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          >
            <Camera size={20} />
            <span>{t.snapshots}</span>
          </button>
        </div>
      )}

      {!readOnly && (
          <div className="fixed bottom-24 right-4 z-[70] animate-in slide-in-from-bottom-5 duration-500">
            <AppGuideAssistant
                setMood={setMood}
                setEnergyLevel={setEnergyLevel}
                setSportLevel={setSportLevel}
                setSleepQuality={setSleepQuality}
                setSocialLevel={setSocialLevel}
                setMotivationLevel={setMotivationLevel}
                setConcentrationLevel={setConcentrationLevel}
                setRegulationLevel={setRegulationLevel}
                setReflection={setReflection}
                goals={goals}
                onUpdateGoal={handleUpdateGoalStatus}
                onSaveRequest={() => setTriggerAutoSave(true)}
                onStartAudioNote={handleStartRecording}
                onStopAudioNote={handleStopRecording}
                hasAudioNote={!!audioNote}
                language={language}
                enabledMetrics={enabledMetrics}
            />
          </div>
      )}
    </div>
  );
};

export default PersonalCanvas;