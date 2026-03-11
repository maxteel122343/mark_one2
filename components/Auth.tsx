import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { LogIn, UserPlus, Mail, Lock, Loader2, Sparkles, X } from 'lucide-react';

interface AuthUIProps {
    onClose: () => void;
}

export const AuthUI: React.FC<AuthUIProps> = ({ onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: email.split('@')[0]
                        }
                    }
                });
                if (error) throw error;
                alert('Confirme seu email para continuar!');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-xl md:p-4 p-0">
            <div className="relative w-full max-w-md h-full md:h-auto overflow-hidden rounded-none md:rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-all z-10"
                >
                    <X size={20} />
                </button>

                {/* Decorative elements */}
                <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl opacity-50" />
                <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl opacity-50" />

                <div className="relative flex flex-col items-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>

                    <h2 className="mb-2 text-3xl font-bold tracking-tight text-white">
                        {isLogin ? 'Bem-vindo ao Chronos' : 'Criar Conta'}
                    </h2>
                    <p className="mb-8 text-sm text-zinc-400">
                        {isLogin ? 'Entre para sincronizar sua rotina' : 'Comece sua jornada de produtividade hoje'}
                    </p>

                    <form onSubmit={handleAuth} className="w-full space-y-4">
                        <div className="group relative">
                            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
                            <input
                                type="email"
                                placeholder="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-zinc-500 outline-none transition-all focus:border-blue-500/50 focus:bg-white/10"
                                required
                            />
                        </div>

                        <div className="group relative">
                            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-blue-400" />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-zinc-500 outline-none transition-all focus:border-blue-500/50 focus:bg-white/10"
                                required
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 py-4 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : isLogin ? (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    Entrar
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Cadastrar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center gap-3 text-sm">
                        <span className="text-zinc-500">
                            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                        </span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-medium text-blue-400 hover:text-blue-300"
                        >
                            {isLogin ? 'Criar agora' : 'Entrar agora'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
