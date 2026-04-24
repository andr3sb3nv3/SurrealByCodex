import React from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-300 font-bold mb-3">
          Surreal Horizons
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
          Tu tablero personal de bienestar y progreso diario
        </h1>
        <p className="text-slate-300 mb-6">
          Registrá cómo te sentís, seguí tus métricas y compartí tu evolución con profesionales de forma simple.
        </p>

        <ol className="space-y-3 text-sm text-slate-200 mb-8 list-decimal list-inside">
          <li>Completá tus indicadores diarios y objetivos.</li>
          <li>Visualizá tendencias en Dashboard y métricas clínicas.</li>
          <li>Compartí acceso con tu profesional cuando lo necesites.</li>
        </ol>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRegister}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-colors"
          >
            Registrarse
          </button>
          <button
            onClick={onLogin}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
