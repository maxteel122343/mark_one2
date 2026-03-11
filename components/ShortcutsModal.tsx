import React, { useState, useEffect } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

import { NavigationFilters } from '../types';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Record<string, string>;
  onUpdateShortcuts: (newShortcuts: Record<string, string>) => void;
  navFilters: NavigationFilters;
  onUpdateNavFilters: (filters: NavigationFilters) => void;
}


const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose, shortcuts, onUpdateShortcuts, navFilters, onUpdateNavFilters }) => {
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const [listeningFor, setListeningFor] = useState<string | null>(null);

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (listeningFor) {
      e.preventDefault();
      e.stopPropagation();

      // Avoid binding Escape or Enter as they are control keys
      if (e.key === 'Escape') {
        setListeningFor(null);
        return;
      }

      const key = e.key.toLowerCase();
      setLocalShortcuts(prev => ({ ...prev, [listeningFor]: key }));
      setListeningFor(null);
    }
  };

  // Attach global listener when listening for a key
  useEffect(() => {
    if (listeningFor) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [listeningFor]);

  const handleSave = () => {
    onUpdateShortcuts(localShortcuts);
    onClose();
  };

  const actionsDisplay = {
    groupByTags: 'Group Cards by Tag',
    openCalendar: 'Open Calendar',
    createEvent: 'Create Event',
    createNote: 'Create Note',
    toggleMic: 'Toggle Microphone'
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-dark-800 border border-white/10 rounded-none md:rounded-xl shadow-2xl w-full max-w-md h-full md:h-auto overflow-hidden flex flex-col md:max-h-[80vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark-900/50">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Keyboard className="text-purple-400" size={20} /> Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-4">
            Click on a shortcut key to rebind it. Press <span className="text-white font-mono bg-white/10 px-1 rounded">Esc</span> to cancel rebinding.
          </p>

          <div className="space-y-2">
            {Object.entries(localShortcuts).map(([actionKey, keyBind]) => (
              <div key={actionKey} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/10 transition">
                <span className="text-gray-200 text-sm font-medium">
                  {(actionsDisplay as any)[actionKey] || actionKey}
                </span>

                <button
                  onClick={() => setListeningFor(actionKey)}
                  className={`
                                min-w-[3rem] px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition border
                                ${listeningFor === actionKey
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500 animate-pulse'
                      : 'bg-dark-900 text-gray-300 border-white/10 hover:bg-white/10 hover:border-white/30'
                    }
                            `}
                >
                  {listeningFor === actionKey ? 'Press Key...' : keyBind}
                </button>
              </div>
            ))}
          </div>

          {/* Navigation Filtering Section */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Navigational Focus (Keyboard)</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'allowNotes', label: 'Notes', color: 'text-yellow-400' },
                { id: 'allowClassic', label: 'Classic Cards', color: 'text-blue-400' },
                { id: 'allowNice', label: 'Nice Cards', color: 'text-purple-400' },
                { id: 'allowGreen', label: 'Green Cards', color: 'text-green-400' },
                { id: 'allowFaster', label: 'Faster Cards', color: 'text-orange-400' },
                { id: 'allowMedia', label: 'Media Files', color: 'text-red-400' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => onUpdateNavFilters({ ...navFilters, [f.id]: !navFilters[f.id as keyof NavigationFilters] })}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${navFilters[f.id as keyof NavigationFilters] ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5 opacity-50'}`}
                >
                  <span className={`text-xs font-bold ${f.color}`}>{f.label}</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${navFilters[f.id as keyof NavigationFilters] ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all transform ${navFilters[f.id as keyof NavigationFilters] ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-dark-900/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded text-sm bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/20 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
