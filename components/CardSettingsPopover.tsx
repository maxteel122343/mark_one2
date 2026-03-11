import React from 'react';
import { CardData, CardShape, CardColor } from '../types';
import { X, Hexagon, Circle, Square, Diamond, Palette, ImageOff, Image as ImageIcon, Timer, List, Settings2, Sparkles, Layout } from 'lucide-react';

interface CardSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardData;
  onUpdate: (id: string, updates: Partial<CardData>) => void;
}

const CardSettingsPopover: React.FC<CardSettingsPopoverProps> = ({
  isOpen,
  onClose,
  card,
  onUpdate,
}) => {
  if (!isOpen) return null;

  const handleShapeChange = (shape: CardShape) => {
    onUpdate(card.id, { shape });
  };

  const handleColorChange = (color: CardColor) => {
    onUpdate(card.id, { color });
  };

  const handleImageShapeToggle = () => {
    onUpdate(card.id, { imageShape: card.imageShape === 'circle' ? 'rectangle' : 'circle' });
  };

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(card.id, { aspectRatio: parseFloat(e.target.value) });
  };

  const colors: CardColor[] = ['red', 'yellow', 'purple', 'blue', 'green'];
  const shapes: CardShape[] = ['rectangle', 'circle', 'hexagon', 'diamond'];

  return (
    <div className="absolute top-full right-0 mt-3 w-72 bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] z-[100] p-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Settings2 size={12} className="text-white" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Configurações</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-50"><X size={18} /></button>
      </div>

      <div className="space-y-6">
        {/* Shape Selector */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Formato do Card</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {shapes.map((shape) => (
              <button
                key={shape}
                onClick={() => handleShapeChange(shape)}
                className={`h-10 flex items-center justify-center rounded-xl transition-all border ${card.shape === shape ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'} `}
                title={shape.charAt(0).toUpperCase() + shape.slice(1)}
              >
                {shape === 'rectangle' && <Square size={16} />}
                {shape === 'circle' && <Circle size={16} />}
                {shape === 'hexagon' && <Hexagon size={16} />}
                {shape === 'diamond' && <Diamond size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Slider (only for circle shape) */}
        {card.shape === 'circle' && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PROPORÇÃO</span>
              <span className="text-[10px] font-black text-blue-600 tabular-nums">{card.aspectRatio?.toFixed(1) || '1.0'}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={card.aspectRatio || 1.0}
              onChange={handleAspectRatioChange}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
            />
          </div>
        )}

        {/* Color Selector */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={12} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tema Visual</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-sm ${card.color === color ? 'border-white ring-4 ring-blue-500/20' : 'border-white-50 shadow-inner'} `}
                style={{ backgroundColor: color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : '#22c55e' }}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* Image Shape Toggle */}
        {card.imageUrl && (
          <div className="pt-4 border-t border-gray-50">
            <button
              onClick={handleImageShapeToggle}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${card.imageShape === 'circle' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-500'} `}
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                {card.imageShape === 'circle' ? <ImageIcon size={14} /> : <ImageOff size={14} />}
                Imagens Circulares
              </div>
              <div className={`w-8 h-4 rounded-full transition-all relative ${card.imageShape === 'circle' ? 'bg-blue-500' : 'bg-gray-300'} `}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${card.imageShape === 'circle' ? 'left-4.5' : 'left-0.5'} `} style={{ left: card.imageShape === 'circle' ? '18px' : '2px' }} />
              </div>
            </button>
          </div>
        )}

        {/* Timer Display Settings */}
        <div className="pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Layout size={12} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Layout do Timer</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'none', label: 'CÍRCULO REDUZIDO', desc: 'Sutil no canto superior' },
              { id: 'pizza-slice', label: 'FATIA DE PIZZA', desc: 'Progresso em arco' },
              { id: 'radial-card-fill', label: 'PREENCHIMENTO TOTAL', desc: 'O card inteiro progride' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => onUpdate(card.id, { timerFillMode: mode.id as any })}
                className={`flex flex-col items-start p-3 rounded-2xl transition-all border text-left ${card.timerFillMode === mode.id || (mode.id === 'none' && !card.timerFillMode) ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/5' : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'} `}
              >
                <span className={`text-[10px] font-black uppercase tracking-tighter ${card.timerFillMode === mode.id || (mode.id === 'none' && !card.timerFillMode) ? 'text-blue-600' : 'text-gray-900'} `}>{mode.label}</span>
                <span className="text-[9px] text-gray-400 font-medium">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lap Time Toggle */}
        <div className="pt-4 border-t border-gray-50">
          <button
            onClick={() => onUpdate(card.id, { lapTimeEnabled: !card.lapTimeEnabled })}
            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${card.lapTimeEnabled ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-500'} `}
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Timer size={14} />
              Habilitar Voltas
            </div>
            <div className={`w-8 h-4 rounded-full transition-all relative ${card.lapTimeEnabled ? 'bg-indigo-500' : 'bg-gray-300'} `}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${card.lapTimeEnabled ? 'left-4.5' : 'left-0.5'} `} style={{ left: card.lapTimeEnabled ? '18px' : '2px' }} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSettingsPopover;

