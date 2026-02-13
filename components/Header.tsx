import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
          HF
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">HairFit AI</h1>
      </div>
      <div className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
        Beta
      </div>
    </header>
  );
};