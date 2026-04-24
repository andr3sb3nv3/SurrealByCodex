import { Language } from './types';

const TRANSLATIONS_RAW = {
  es: {
    // ... existing translations ...
    // General
    loading: "Cargando...",
    save: "Guardar",
    saved: "¡Guardado en la Nube!",
    error: "Error",
    back: "Volver",
    
    // Auth
    login: "Ingresar",
    logout: "Cerrar Sesión",
    welcome: "Bienvenido",
    createAccount: "Crear Cuenta",
    guest: "Invitado",
    demoUser: "Usuario Demo 1",
    demoUser2: "Usuario Demo 2",
    demoUser3: "Demo 3 (Perfecto '25)",
    demoUser4: "Andrés Benve (Pro)",
    simulation: "Simulación",
    seedDb: "Generar Datos DB",
    dbSeeded: "Datos generados para Demos (incluyendo 2025)",
    seedErrorPermissions: "Error de Permisos (Firestore)",
    firestoreRulesHelp: "Copia este código UNIFICADO en Firebase Console -> Firestore Database -> Reglas:",

    // Header
    platformName: "Personal Growth Platform",
    proMember: "Miembro Pro",

    // Onboarding
    onboarding: {
      welcomeTitle: "Tu viaje comienza hoy",
      welcomeDesc: "Surreal Horizons es tu espacio para la reflexión, el crecimiento y la disciplina. Tómate un momento para configurar tu entorno personal.",
      step1Title: "Bienvenida", // Not used visually in new design but kept for structure
      step1Desc: "",
      step2Title: "Elige tus métricas",
      step2Desc: "Selecciona qué indicadores quieres rastrear diariamente.",
      step3Title: "Metas Diarias",
      step3Desc: "Estas serán tus 4 objetivos principales para hoy. Puedes editarlos o cambiarlos ahora.",
      continue: "Continuar",
      startConfig: "Configurar mi espacio",
      finish: "Comenzar mi viaje",
      addGoal: "Agregar Objetivo",
      // Interests keys removed as they are no longer used in Step 1
      interests: {} 
    },

    // Canvas / Main
    indicators: {
      mood: { label: "Ánimo", desc: "Estado emocional general y felicidad." },
      energy: { label: "Energía", desc: "Nivel de vitalidad física." },
      sport: { label: "Deporte", desc: "Intensidad actividad física." },
      social: { label: "Social", desc: "Satisfacción interacciones sociales." },
      motivation: { label: "Motivación", desc: "Impulso interno para lograr objetivos." },
      focus: { label: "Foco", desc: "Capacidad de atención y claridad." },
      emotional: { label: "Int. Emoc.", desc: "Gestión del estrés y emociones." },
      sleep: { label: "Sueño", desc: "Calidad del descanso nocturno." },
    },
    goalsTitle: "Metas",
    goalsToday: "Diarias",
    goalsOf: "del",
    edit: "Editar",
    finishEdit: "Terminar edición",
    newGoalPlaceholder: "Escribe un nuevo objetivo...",
    startJourney: "Comienza tu viaje",
    noGoalsDesc: "Aún no tienes objetivos. Define tus metas para empezar.",
    createFirstGoal: "Crear primer objetivo",
    resetDay: "Reiniciar día",
    viewComments: "Ver Comentarios",
    journalPlaceholder: "Escribe aquí...",
    journalPastPlaceholder: "¿Qué pasó el",
    editingMode: "Editando:",
    changeDay: "Cambiar día",
    snapshots: "Snapshots",
    guideTitle: "Guía de Indicadores",
    viewDetails: "Ver detalles",
    detoxTitle: "Detox & Retos",
    detoxPlaceholder: "Ej: 90 días sin alcohol",
    detoxDaysLabel: "Días Totales",
    detoxStartBtn: "Comenzar",
    detoxRemaining: "Días Restantes",
    detoxEmpty: "No hay retos activos. ¡Comienza uno hoy!",
    detoxNameLabel: "Nombre del Reto",
    
    // Audio
    audio: {
      voiceNoteTitle: "Nota de Voz de Hoy",
      voiceNote: "Nota de Voz",
      record: "Grabar Nota",
      stop: "Detener Grabación",
      recording: "Grabando...",
      play: "Reproducir",
      delete: "Eliminar",
      permissionError: "Permiso de micrófono denegado",
      tapToRecord: "Toca para grabar tu día"
    },

    // Dashboard
    dashboardTitle: "Dashboard",
    noData: "No hay registros en la nube.",
    generateDemo: "Generar Datos Demo",
    generating: "Generando...",
    stats: {
      mood: "Ánimo",
      energy: "Energía",
      sport: "Deporte",
      social: "Social",
      motiv: "Motiv.",
      focus: "Foco",
      reg: "I. Emoc.",
      sleep: "Sueño",
      progress: "Progreso"
    },
    history: "Historial",
    productivity: "Productividad",
    viewMonthComments: "Ver Comentarios del Mes",
    averageMetrics: "Promedio de Métricas",
    clinicalMetrics: "Métricas Clínicas",
    historical: {
      cta: "Ver Histórico",
      title: "Histórico de Métricas",
      hint: "Tocá un punto del gráfico para ver el detalle del día.",
      selectMetric: "Seleccionar métrica",
      rangeLabel: (n: number) => `Últimos ${n} meses`,
      noDataInRange: "Sin datos suficientes en este rango.",
      reflection: "Reflexión",
      progress: "Progreso",
      completed: "Completados",
      pending: "Pendientes",
      average: "Promedio",
      entries: "registros"
    },

    // Profile
    memberSince: "Miembro desde",
    currentStreak: "Racha Actual",
    days: "días",
    focusAreas: "Áreas de Enfoque",
    subscription: "Suscripción",
    currentPlan: "Plan Actual",
    manage: "Gestionar",
    settings: "Configuración",
    notifications: "Notificaciones",
    language: "Idioma",
    theme: "Fondo",
    themes: {
      light: "Claro",
      dark: "Obscuro",
      system: "Inteligente"
    },
    privacy: "Privacidad y Conexiones",
    privacyLocked: "Función Pro Bloqueada",
    privacyLockedDesc: "Comparte tu progreso con mentores o amigos actualizando a Pro.",
    privacyInfoWarning: "Importante: Al dar acceso a otra persona (psicólogo, coach, pareja, etc.), esta tendrá acceso completo a toda la información histórica que has cargado desde tu primer registro.",
    dangerZone: "Zona de Peligro",
    deleteAccount: "Eliminar cuenta permanentemente",
    uploadPhoto: "Foto de perfil actualizada",
    freePlan: "Plan Gratuito",
    upgradeToPro: "Mejorar a Pro",
    proFeatures: "Desbloquea estadísticas avanzadas y almacenamiento ilimitado.",
    simulatePro: "Simular Estado Pro",
    manageSubscription: "Gestionar Suscripción",
    cancelSubscription: "Cancelar Suscripción",
    cancelSubscriptionDesc: "¿Estás seguro de que deseas cancelar tu suscripción Premium? Perderás acceso a las funciones Pro al final del ciclo de facturation actual.",
    subscriptionCanceled: "Suscripción cancelada correctamente",
    keepSubscription: "Mantener Suscripción",
    aiCoach: {
        title: "AI Performance Coach",
        desc: "Análisis inteligente de tu semana actual vs. tu tendencia mensual.",
        analyzeBtn: "Generar Reporte",
        analyzing: "Analizando patrones...",
        modalTitle: "Reporte de Rendimiento",
        close: "Cerrar",
        tacticsTitle: "Tácticas para Hoy",
        psychTitle: "Mindset & Psicología",
        quoteTitle: "Dosis Diaria"
    },
    
    // Year In Pixels
    yearInPixels: "Año en Píxeles",
    yearInPixelsDesc: "Visualiza tu año emocional en un vistazo.",
    moodHeatmap: "Mapa de Calor Emocional",
    legend: {
      terrible: "Terrible",
      bad: "Malo",
      neutral: "Neutral",
      good: "Bueno",
      excellent: "Increíble"
    },

    // Sharing
    shareTitle: "Buscar Usuario",
    shareDesc: "Busca por correo electrónico para dar acceso a tu progreso.",
    emailPlaceholder: "usuario@ejemplo.com",
    addUser: "Dar Acceso",
    sharedWith: "Usuarios con Acceso",
    noSharedUsers: "Aún no has compartido tu perfil con nadie.",
    stopSharing: "Revocar acceso",
    stopViewing: "Eliminar de mi lista",
    userAdded: "Usuario vinculado correctamente",
    userRemoved: "Acceso revocado",
    incomingShareRemoved: "Perfil eliminado de tu lista",
    search: "Buscar",
    invitationSent: "Invitación enviada",
    invitationSentDesc: "El usuario verá tu perfil automáticamente la próxima vez que inicie sesión.",
    invitationProcessed: "Invitaciones aceptadas",
    invitationProcessedDesc: "Se han vinculado nuevos perfiles compartidos contigo.",
    
    // Shared With Me
    sharedWithMe: "Compartido Conmigo",
    sharedWithMeDesc: "Personas que te han dado acceso a su progreso.",
    viewProfile: "Ver Perfil",
    noIncomingShares: "Nadie ha compartido su información contigo.",
    viewingProfileOf: "Viendo el perfil de:",
    exitSharedView: "Volver a mi perfil",
    readOnlyMode: "Modo Lectura",
    patientAccessDenied: "Este paciente no te concedió acceso, o todavía no aceptó tu solicitud.",
    patientAccessError: "No se pudo abrir el perfil del paciente. Intentá de nuevo.",
    simulateIncomingShare: "Simular que Demo me comparte",

    // Assistant
    assistantButton: "Asistente Virtual",
    assistantListening: "Escuchando...",
    assistantStop: "Detener",
    assistantPrompts: {
      mood: "¿Cómo estuvo tu ánimo del 1 al 10?",
      energy: "¿Y tu energía?",
      sport: "¿Y el deporte?",
      social: "¿Y lo social?",
      motivation: "¿La motivación?",
      concentration: "¿La concentración?",
      emotional: "¿La inteligencia emocional?",
      sleep: "¿El sueño? ¿Cómo dormiste ayer?",
      goalsIntro: "Bien. Pasemos a los objetivos.",
      goalAsk: "¿Pudiste",
      journalAsk: "Por último, ¿alguna nota para el diario?",
      notHeard: "No te escuché.",
      saving: "Listo. Guardando cambios.",
      registered: "Registrado",
      audioNoteIntro: "Ahora grabá tu nota de voz. Tenés hasta 30 segundos.",
      audioNoteSaved: "Nota de voz guardada.",
      audioNoteSkipped: "Ya hay una nota de voz. La mantenemos."
    }
  },
  en: {
    // ... existing translations ...
    // General
    loading: "Loading...",
    save: "Save",
    saved: "Saved to Cloud!",
    error: "Error",
    back: "Back",
    
    // Auth
    login: "Sign In",
    logout: "Log Out",
    welcome: "Welcome",
    createAccount: "Create Account",
    guest: "Guest",
    demoUser: "Demo User 1",
    demoUser2: "Demo User 2",
    demoUser3: "Demo 3 (Perfect '25)",
    demoUser4: "Andrés Benve (Pro)",
    simulation: "Simulation",
    seedDb: "Seed DB Data",
    dbSeeded: "Generated Demo Data (incl. 2025)",
    seedErrorPermissions: "Permission Error (Firestore)",
    firestoreRulesHelp: "Copy this UNIFIED code to Firebase Console -> Firestore Database -> Rules:",

    // Header
    platformName: "Personal Growth Platform",
    proMember: "Pro Member",

    // Onboarding
    onboarding: {
      welcomeTitle: "Your Journey Begins Today",
      welcomeDesc: "Surreal Horizons is your space for reflection, growth, and discipline. Let's set up your personal environment.",
      step1Title: "Welcome",
      step1Desc: "",
      step2Title: "Choose your metrics",
      step2Desc: "Select which indicators you want to track daily.",
      step3Title: "Daily Goals",
      step3Desc: "These will be your 4 main goals for today. You can edit them now.",
      continue: "Continue",
      startConfig: "Set up my space",
      finish: "Start My Journey",
      addGoal: "Add Goal",
      interests: {}
    },

    // Canvas / Main
    indicators: {
      mood: { label: "Mood", desc: "General emotional state and happiness." },
      energy: { label: "Energy", desc: "Physical vitality level." },
      sport: { label: "Sport", desc: "Physical activity intensity." },
      social: { label: "Social", desc: "Social interaction satisfaction." },
      motivation: { label: "Motivation", desc: "Internal drive to achieve goals." },
      focus: { label: "Focus", desc: "Attention capacity and clarity." },
      emotional: { label: "Emot. Int.", desc: "Stress management and regulation." },
      sleep: { label: "Sleep", desc: "Night rest quality." },
    },
    goalsTitle: "Goals",
    goalsToday: "Today",
    goalsOf: "for",
    edit: "Edit",
    finishEdit: "Done Editing",
    newGoalPlaceholder: "Write a new goal...",
    startJourney: "Start your journey",
    noGoalsDesc: "No goals set yet. Define your goals to start tracking.",
    createFirstGoal: "Create first goal",
    resetDay: "Reset day",
    viewComments: "View Comments",
    journalPlaceholder: "Write here...",
    journalPastPlaceholder: "What happened on",
    editingMode: "Editing:",
    changeDay: "Change day",
    snapshots: "Snapshots",
    guideTitle: "Indicators Guide",
    viewDetails: "View details",
    detoxTitle: "Detox & Challenges",
    detoxPlaceholder: "e.g. 90 days no alcohol",
    detoxDaysLabel: "Total Days",
    detoxStartBtn: "Start",
    detoxRemaining: "Days Left",
    detoxEmpty: "No active challenges. Start one today!",
    detoxNameLabel: "Challenge Name",

    // Audio
    audio: {
      voiceNoteTitle: "Today's Voice Note",
      voiceNote: "Voice Note",
      record: "Record Note",
      stop: "Stop Recording",
      recording: "Recording...",
      play: "Play",
      delete: "Delete",
      permissionError: "Microphone permission denied",
      tapToRecord: "Tap to record your day"
    },

    // Dashboard
    dashboardTitle: "Dashboard",
    noData: "No cloud records found.",
    generateDemo: "Generate Demo Data",
    generating: "Generating...",
    stats: {
      mood: "Mood",
      energy: "Energy",
      sport: "Sport",
      social: "Social",
      motiv: "Motiv.",
      focus: "Focus",
      reg: "Emot. Int.",
      sleep: "Sleep",
      progress: "Progress"
    },
    history: "History",
    productivity: "Productivity",
    viewMonthComments: "View Month Comments",
    averageMetrics: "Average Metrics",
    clinicalMetrics: "Clinical Metrics",
    historical: {
      cta: "View History",
      title: "Metric History",
      hint: "Tap a point on the chart to see the day detail.",
      selectMetric: "Select metric",
      rangeLabel: (n: number) => `Last ${n} months`,
      noDataInRange: "Not enough data in this range.",
      reflection: "Reflection",
      progress: "Progress",
      completed: "Completed",
      pending: "Pending",
      average: "Average",
      entries: "entries"
    },

    // Profile
    memberSince: "Member since",
    currentStreak: "Current Streak",
    days: "days",
    focusAreas: "Focus Areas",
    subscription: "Subscription",
    currentPlan: "Current Plan",
    manage: "Manage",
    settings: "Settings",
    notifications: "Notifications",
    language: "Language",
    theme: "Theme",
    themes: {
      light: "Light",
      dark: "Dark",
      system: "Smart/System"
    },
    privacy: "Privacy & Connections",
    privacyLocked: "Pro Feature Locked",
    privacyLockedDesc: "Share your progress with mentors or friends by upgrading to Pro.",
    privacyInfoWarning: "Important: Granting access to another person (psychologist, coach, partner, etc.) gives them complete access to all historical information you have logged since your first entry.",
    dangerZone: "Danger Zone",
    deleteAccount: "Delete account permanently",
    uploadPhoto: "Profile photo updated",
    freePlan: "Free Plan",
    upgradeToPro: "Upgrade to Pro",
    proFeatures: "Unlock advanced analytics and unlimited storage.",
    simulatePro: "Simulate Pro Status",
    manageSubscription: "Manage Subscription",
    cancelSubscription: "Cancel Subscription",
    cancelSubscriptionDesc: "Are you sure you want to cancel your Premium subscription? You will lose access to Pro features at the end of the billing cycle.",
    subscriptionCanceled: "Subscription successfully canceled",
    keepSubscription: "Keep Subscription",
    aiCoach: {
        title: "AI Performance Coach",
        desc: "Smart analysis of your current week vs. monthly trend.",
        analyzeBtn: "Generate Report",
        analyzing: "Analyzing patterns...",
        modalTitle: "Performance Report",
        close: "Close",
        tacticsTitle: "Tactical Steps",
        psychTitle: "Mindset & Psychology",
        quoteTitle: "Daily Dose"
    },
    
    // Year In Pixels
    yearInPixels: "Year in Pixels",
    yearInPixelsDesc: "Visualize your emotional year at a glance.",
    moodHeatmap: "Emotional Heatmap",
    legend: {
      terrible: "Terrible",
      bad: "Bad",
      neutral: "Neutral",
      good: "Good",
      excellent: "Excellent"
    },

    // Sharing
    shareTitle: "Search User",
    shareDesc: "Search by email to grant access to your progress.",
    emailPlaceholder: "user@example.com",
    addUser: "Grant Access",
    sharedWith: "Users with Access",
    noSharedUsers: "You haven't shared your profile with anyone yet.",
    stopSharing: "Revoke access",
    stopViewing: "Remove from my list",
    userAdded: "User linked successfully",
    userRemoved: "Access revoked",
    incomingShareRemoved: "Profile removed from your list",
    search: "Search",
    invitationSent: "Invitation sent",
    invitationSentDesc: "The user will automatically see your profile next time they log in.",
    invitationProcessed: "Invitations Accepted",
    invitationProcessedDesc: "New shared profiles have been linked to your account.",
    
    // Shared With Me
    sharedWithMe: "Shared With Me",
    sharedWithMeDesc: "People who have granted you access to their progress.",
    viewProfile: "View Profile",
    noIncomingShares: "No one has shared their information with you.",
    viewingProfileOf: "Viewing profile of:",
    exitSharedView: "Back to my profile",
    readOnlyMode: "Read Only",
    patientAccessDenied: "This patient has not granted you access, or has not yet accepted your request.",
    patientAccessError: "Could not open the patient's profile. Please try again.",
    simulateIncomingShare: "Simulate Demo Sharing With Me",

    // Assistant
    assistantButton: "Virtual Assistant",
    assistantListening: "Listening...",
    assistantStop: "Stop",
    assistantPrompts: {
      mood: "How was your mood from 1 to 10?",
      energy: "And your energy?",
      sport: "And sports?",
      social: "How about social?",
      motivation: "Motivation?",
      concentration: "Concentration?",
      emotional: "Emotional intelligence?",
      sleep: "Sleep? How did you sleep?",
      goalsIntro: "Good. Let's move to goals.",
      goalAsk: "Did you complete",
      journalAsk: "Finally, any note for the journal?",
      notHeard: "I didn't hear you.",
      saving: "Done. Saving changes.",
      registered: "Registered",
      audioNoteIntro: "Now record your voice note. You have up to 30 seconds.",
      audioNoteSaved: "Voice note saved.",
      audioNoteSkipped: "A voice note already exists. Keeping it."
    }
  },
  // Other languages would follow similar updates...
  fr: {
    // ... existing ...
    yearInPixels: "Année en Pixels",
    // ... rest ...
  },
  de: {
    // ... existing ...
    yearInPixels: "Jahr in Pixeln",
    // ... rest ...
  },
  it: {
    // ... existing ...
    yearInPixels: "Anno in Pixel",
    // ... rest ...
  },
  ru: {
    // ... existing ...
    yearInPixels: "Год в пикселях",
    // ... rest ...
  },
  zh: {
    // ... existing ...
    yearInPixels: "像素年",
    // ... rest ...
  }
};

export type TranslationSchema = typeof TRANSLATIONS_RAW.es;
export const TRANSLATIONS: Record<Language, TranslationSchema> = TRANSLATIONS_RAW as Record<Language, TranslationSchema>;
