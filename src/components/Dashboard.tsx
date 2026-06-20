'use client';
import React, { useState, useEffect } from 'react';
import { Product, Payment, PaymentStatus, Charge } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  products: Product[];
  payments: Payment[];
  charges: Charge[];
}

const Dashboard: React.FC<DashboardProps> = ({ products = [], payments = [], charges = [] }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalStockValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);
  const totalPendingPurchases = charges.filter(c => c.category === 'Marchandises').reduce((acc, c) => acc + (c.amount - c.paidAmount), 0);
  const totalPendingSales = payments.filter(p => p.status !== PaymentStatus.PAID).reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock);
  const overduePayments = payments.filter(p => p.status === PaymentStatus.OVERDUE);

  if (!mounted) {
    return (
      <div className="p-8 text-slate-400 font-bold animate-pulse">
        Initialisation du Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="p-3 bg-white rounded-3xl shadow-sm border border-slate-100">👋</span>
            Tableau de Bord
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Voici l'état actuel de votre business.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 p-2 rounded-3xl border border-white/80">
          <span className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20">LIVE</span>
          <span className="text-xs font-bold text-slate-500 pr-4">Mise à jour instantanée</span>
        </div>
      </header>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento-card p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Valeur Totale Stock</p>
              <p className="text-4xl font-black mt-3 tabular-nums">{totalStockValue.toLocaleString()} <span className="text-xl">DH</span></p>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">📦</div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs font-bold">
            <span className="text-blue-100">Marge brute estimée</span>
            <span className="px-3 py-1 bg-white/10 rounded-full">~ 25%</span>
          </div>
        </div>

        <div className="bento-card p-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Encours Fournisseurs</p>
          <p className="text-3xl font-black text-emerald-600 mt-3 tabular-nums">{totalPendingPurchases.toLocaleString()} <span className="text-sm">DH</span></p>
          <div className="mt-8 flex items-center gap-2">
            <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-2/3"></div>
            </div>
            <span className="text-[10px] font-black text-emerald-600">En attente</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">Achats à régler prochainement</p>
        </div>

        <div className="bento-card p-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Encours Clients</p>
          <p className="text-3xl font-black text-amber-600 mt-3 tabular-nums">{totalPendingSales.toLocaleString()} <span className="text-sm">DH</span></p>
          <div className="mt-8 flex items-center gap-2">
            <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-4/5"></div>
            </div>
            <span className="text-[10px] font-black text-amber-600">En attente</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">Factures en attente d'encaissement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bento-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
              Alertes Stock ({lowStockItems.length})
            </h3>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Voir tout</button>
          </div>
          <div className="space-y-4">
            {lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-lg">📦</div>
                   <div><p className="text-sm font-black text-slate-800">{item.name}</p><p className="text-[10px] text-slate-400 font-mono tracking-wider">{item.sku}</p></div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Stock</p><p className={`font-black ${item.stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>{item.stock}</p></div>
                   <span className={`w-2 h-10 rounded-full ${item.stock === 0 ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                </div>
              </div>
            )) : <div className="text-center py-12 flex flex-col items-center gap-4"><div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-2xl">✅</div><p className="text-slate-400 text-sm font-medium">Tout est en stock. Aucun réapprovisionnement urgent.</p></div>}
          </div>
        </div>

        <div className="bento-card p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Retards Paiements ({overduePayments.length})
            </h3>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Recouvrir</button>
          </div>
          <div className="space-y-4">
            {overduePayments.length > 0 ? overduePayments.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-lg">📄</div>
                   <div><p className="text-sm font-black text-slate-800">{p.customerName}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{p.invoiceNumber}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-rose-600">{(p.amount - p.paidAmount).toLocaleString()} <span className="text-[10px]">DH</span></p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Échéance dépassée</p>
                </div>
              </div>
            )) : <div className="text-center py-12 flex flex-col items-center gap-4"><div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-2xl">💰</div><p className="text-slate-400 text-sm font-medium">Aucun retard détecté. Vos clients sont à jour.</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;