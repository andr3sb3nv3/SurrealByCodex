import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, title, children, onConfirm, onCancel, 
  confirmText = "Confirmar", cancelText = "Cancelar" 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <div className="text-slate-600 text-sm">{children}</div>
        </div>
        <div className="bg-slate-50 p-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition shadow-md hover:shadow-lg">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
