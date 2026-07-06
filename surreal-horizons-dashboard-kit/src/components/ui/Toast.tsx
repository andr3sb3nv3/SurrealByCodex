import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  let className = "bg-emerald-600 text-white";
  let Icon = CheckCircle2;

  if (type === 'error') {
    className = "bg-red-600 text-white";
    Icon = AlertCircle;
  } else if (type === 'warning') {
    className = "bg-amber-500 text-white";
    Icon = AlertTriangle;
  }

  return (
    <div className={`fixed bottom-24 right-4 z-[90] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${className}`}>
      <Icon size={20} />
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Toast;