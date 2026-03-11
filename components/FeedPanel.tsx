import React from 'react';
import { X, TrendingUp, Heart, Share2, Award, Clock, CheckCircle2, User as UserIcon, MessageSquare } from 'lucide-react';
import { FeedPost } from '../types';

interface FeedPanelProps {
    isOpen: boolean;
    onClose: () => void;
    posts: FeedPost[];
    onLike: (postId: string) => void;
    onCall: (cardId: string) => void;
    currentUserId: string;
}

const FeedPanel: React.FC<FeedPanelProps> = ({
    isOpen,
    onClose,
    posts,
    onLike,
    onCall,
    currentUserId
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-[450px] z-[4000] bg-white/95 backdrop-blur-3xl border-l border-gray-100 shadow-[-40px_0_80px_rgba(0,0,0,0.08)] flex flex-col animate-in slide-in-from-right duration-700 cubic-bezier(0.4, 0, 0.2, 1)">
            {/* Header */}
            <div className="md:p-10 p-4 border-b border-gray-50/50">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50 rotate-3">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">Global Feed</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 ml-0.5">Atividade da Comunidade Chronos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Posts Hoje</span>
                        <span className="text-xl font-black text-gray-900">{posts.length}</span>
                    </div>
                    <div className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Engajamento</span>
                        <span className="text-xl font-black text-gray-900">High</span>
                    </div>
                </div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto md:p-10 p-4 space-y-8 md:space-y-10 custom-scrollbar">
                {posts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                        <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                            <TrendingUp size={40} />
                        </div>
                        <p className="text-lg font-black text-gray-500">Silêncio no feed...</p>
                        <p className="text-sm mt-1 max-w-[200px] text-center">Conclua tarefas públicas para aparecer aqui!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="group relative flex flex-col bg-white rounded-[40px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1">
                            {/* User Info Header */}
                            <div className="p-6 flex items-center justify-between border-b border-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl border-2 border-gray-50 overflow-hidden shadow-sm shadow-blue-500/10">
                                        <img
                                            src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                                            alt={post.userName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 leading-none">{post.userName}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium">Postado há pouco</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 shadow-sm shadow-amber-500/5">
                                    <Award size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Gold Tier</span>
                                </div>
                            </div>

                            {/* Card Content Snapshot */}
                            <div className="p-8">
                                <div
                                    className="p-6 rounded-[32px] border mb-6 relative overflow-hidden group/card"
                                    style={{
                                        backgroundColor: post.cardData.color === 'red' ? '#fef2f2' : post.cardData.color === 'yellow' ? '#fefce8' : post.cardData.color === 'purple' ? '#faf5ff' : post.cardData.color === 'blue' ? '#eff6ff' : post.cardData.color === 'green' ? '#f0fdf4' : '#f9fafb',
                                        borderColor: post.cardData.color === 'red' ? '#fee2e2' : post.cardData.color === 'yellow' ? '#fef9c3' : post.cardData.color === 'purple' ? '#f3e8ff' : post.cardData.color === 'blue' ? '#dbeafe' : post.cardData.color === 'green' ? '#dcfce7' : '#f3f4f6'
                                    }}
                                >
                                    <div className="relative z-10">
                                        <h4 className="text-md font-black text-gray-900 mb-1">{post.cardData.title}</h4>
                                        <p className="text-xs text-gray-500 font-medium line-clamp-2">{post.cardData.description}</p>
                                    </div>

                                    <div className="mt-5 flex items-center gap-4 border-t border-black/5 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tempo</span>
                                            <span className="text-xs font-black text-gray-700">{Math.floor(post.stats.record || 0 / 60)}m</span>
                                        </div>
                                        <div className="w-px h-6 bg-black/5" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                                            <div className="flex items-center gap-1 text-emerald-600 font-black text-xs uppercase tracking-tighter">
                                                <CheckCircle2 size={10} /> Concluído
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Interaction Bar */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onLike(post.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all shadow-sm ${post.likedBy.includes(currentUserId) ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                        >
                                            <Heart size={16} fill={post.likedBy.includes(currentUserId) ? "currentColor" : "none"} />
                                            <span className="text-xs font-black">{post.likes}</span>
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-all border border-transparent hover:border-blue-100 shadow-sm">
                                            <MessageSquare size={16} />
                                            <span className="text-xs font-black">2</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => onCall(post.cardId)}
                                        className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                                        title="Ligar para usuário (Chronos IA)"
                                    >
                                        <Award size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Sticky Interaction Footer */}
            <div className="md:p-10 p-4 bg-white/50 border-t border-gray-100 backdrop-blur-md">
                <button
                    className="w-full bg-dark-900 text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    <Share2 size={18} /> Compartilhar meu progresso
                </button>
            </div>
        </div>
    );
};

export default FeedPanel;
