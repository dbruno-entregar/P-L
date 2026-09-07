import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-3 rounded-xl shadow-xl text-[13px] font-medium transition-all duration-300 flex items-center gap-2 border border-[#374151]">
      <span>{message}</span>
    </div>
  );
};
