'use client';

import React, { useState } from 'react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '@/firebase';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const auth = useAuth();

  const handleResetPassword = () => {
    const email = username.trim();
    if (!email.includes('@')) {
      alert("Veuillez saisir une adresse e-mail valide dans le champ Identifiant.");
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setResetSent(true);
        alert(`Un e-mail de réinitialisation de mot de passe a été envoyé à : ${email}`);
      })
      .catch((err) => {
        console.error("Reset password error", err);
        alert(`Erreur lors de l'envoi de l'e-mail: ${err.message}`);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    const email = username.trim();
    
    if (!email.includes('@') || !password) {
      setError(true);
      setLoading(false);
      return;
    }

    // Try to sign in. If it fails, try to create the account automatically.
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        setLoading(false);
      })
      .catch((signInError) => {
        console.warn("Sign in failed, attempting to register user instead:", signInError);
        createUserWithEmailAndPassword(auth, email, password)
          .then(() => {
            setLoading(false);
          })
          .catch((signUpError) => {
            console.error("Sign up error", signUpError);
            setError(true);
            setLoading(false);
          });
      });
  };

  return (
    <div className="fixed inset-0 bg-[#0A0F1D] flex items-center justify-center p-4 z-[1000] overflow-hidden font-['Inter']">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md animate-fadeIn relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/10 p-10 md:p-12">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(37,99,235,0.3)] animate-bounce-slow">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">TP MASTER</h1>
            <p className="text-slate-400 text-sm mt-3 font-medium tracking-wide">Accédez à votre intelligence métier</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Identifiant</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input
                  type="text"
                  className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-white font-bold placeholder-slate-600"
                  placeholder="Votre identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  type="password"
                  className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-white font-bold placeholder-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="space-y-3">
                <div className="bg-rose-500/10 text-rose-500 text-[11px] font-black p-4 rounded-2xl text-center animate-shake uppercase tracking-widest border border-rose-500/20">
                  Accès refusé. Mot de passe incorrect ou e-mail déjà existant.
                </div>
                <div className="flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors underline"
                  >
                    Mot de passe oublié ? Réinitialiser
                  </button>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Astuce : essayez un autre e-mail (ex: ali-test@tpmaster.com) pour créer un nouveau compte de test.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] font-black shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] mt-6 uppercase text-xs tracking-[0.2em] disabled:bg-slate-500"
            >
              {loading ? 'Connexion...' : 'Connexion'}
            </button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-white/5">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Core v3.0 Intelligence</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-bounce-slow { animation: bounce-slow 4s infinite ease-in-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s infinite; }
      `}</style>
    </div>
  );
};

export default Login;
