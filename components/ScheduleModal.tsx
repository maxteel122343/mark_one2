import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Bell, Check } from 'lucide-react';
import { CardData } from '../types';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: CardData | null;
    onSchedule: (cardId: string, start: string, reminderHours: number) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, card, onSchedule }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reminderHours, setReminderHours] = useState(0);

    useEffect(() => {
        if (card && card.scheduledStart) {
            const d = new Date(card.scheduledStart);
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toTimeString().split(' ')[0].substring(0, 5));
            setReminderHours(card.reminderHours || 0);
        } else {
            // Default to today and current hour + 1
            const now = new Date();
            setDate(now.toISOString().split('T')[0]);
            const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
            setTime(nextHour.toTimeString().split(' ')[0].substring(0, 5));
            setReminderHours(0);
        }
    }, [card, isOpen]);

    if (!isOpen || !card) return null;

    const handleSave = () => {
        if (!date || !time) return;
        const start = new Date(`${date}T${time}`).toISOString();
        onSchedule(card.id, start, reminderHours);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[4000] flex items-center justify-center md:p-4 p-0" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-none md:rounded-2xl w-full max-w-sm h-full md:h-auto flex flex-col shadow-2xl overflow-hidden animate-in md:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="text-blue-500" size={20} /> Agendar Card
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Card Preview */}
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Card a ser agendado</span>
                        <div className="text-sm font-bold text-white truncate">{card.title}</div>
                    </div>

                    {/* Date Pick */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <Calendar size={14} /> Data do Evento
                        </label>
                        <input
                            type="date"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>

                    {/* Time Pick */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <Clock size={14} /> Horário
                        </label>
                        <input
                            type="time"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                        />
                    </div>

                    {/* Reminder Pick */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <Bell size={14} /> Lembrete Antecipado
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2, 3, 5].map(h => (
                                <button
                                    key={h}
                                    onClick={() => setReminderHours(h)}
                                    className={`py-2 px-1 rounded-md text-[10px] font-bold border transition ${reminderHours === h ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {h === 0 ? 'Sem aviso' : `${h} ${h === 1 ? 'hora' : 'horas'} antes`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition"
                    >
                        <Check size={18} /> Confirmar Agendamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleModal;
