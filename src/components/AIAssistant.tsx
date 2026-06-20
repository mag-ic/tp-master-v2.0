'use client';
import React, { useState } from 'react';
import { Product, Payment } from '@/lib/types';
import { analyzeBusiness } from '@/ai/flows/analyze-business-flow';

interface AIAssistantProps {
  products: Product[];
  payments: Payment[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ products, payments }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      // Utilisation du Flow Genkit sécurisé (Server Side)
      const result = await analyzeBusiness({ 
        products, 
        payments, 
        userPrompt: prompt 
      });
      setResponse(result.analysis);
    } catch (err) {
      setResponse("Une erreur est survenue lors de l'analyse. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Quels produits sont proches de la rupture ?",
    "Analyse mes paiements en retard.",
    "État général de l'entreprise ?",
    "Factures prioritaires ?"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="text-center py-12 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-inner border border-white/20">✨</div>
          <h2 className="text-4xl font-black tracking-tight">Assistant IA</h2>
          <p className="text-blue-200/70 mt-3 text-lg font-medium px-6">L'intelligence artificielle au service de votre rentabilité.</p>
        </div>
      </header>

      <div className="bento-card overflow-hidden min-h-[600px] flex flex-col relative bg-white/70 backdrop-blur-md">
        <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar">
          {!response && !loading && (
            <div className="text-center py-20">
              <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-[10px] mb-8">Comment puis-je vous aider aujourd'hui ?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestions.map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { setPrompt(s); }}
                    className="text-sm bg-white hover:bg-blue-600 hover:text-white text-slate-700 px-6 py-4 rounded-[1.5rem] transition-all duration-300 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 font-bold text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-500 font-bold animate-pulse uppercase text-[10px] tracking-widest">Analyse multidimensionnelle en cours...</p>
            </div>
          )}

          {response && (
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm animate-fadeIn relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-xs font-black">AI</div>
              <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                {response}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-3xl mx-auto">
            <input
              type="text"
              className="w-full pl-6 pr-16 py-5 bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] border-none text-slate-800 font-bold placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Posez votre question business..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute right-3 w-12 h-12 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-lg flex items-center justify-center active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>
          <p className="text-center text-[9px] text-slate-400 font-black uppercase mt-4 tracking-widest">Alimenté par Google Gemini & Genkit</p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;