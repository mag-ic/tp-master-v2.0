
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Payment, Charge, PaymentMethod, PaymentStatus, PaymentHistoryEntry, Apport } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Lock, RotateCcw, ArrowUpRight, ArrowDownLeft, Wallet, PlusCircle, X, Banknote, CreditCard } from 'lucide-react';

interface TreasuryProps {
  payments: Payment[];
  charges: Charge[];
  apports: Apport[];
  onInternalTransfer: (amount: number, date: string) => void;
  onCapitalIncrease?: (amount: number, date: string, method: PaymentMethod) => void;
  isReadOnly?: boolean;
}

interface TransactionRecord {
  id: string;
  date: string;
  label: string;
  partner: string;
  category: string;
  mode: PaymentMethod;
  amount: number;
  type: 'IN' | 'OUT';
}

const Treasury: React.FC<TreasuryProps> = ({ payments, charges, apports, onInternalTransfer, onCapitalIncrease, isReadOnly = false }) => {
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  
  // States for modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showApportModal, setShowApportModal] = useState(false);
  
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferDate, setTransferDate] = useState('');
  
  const [apportAmount, setApportAmount] = useState<number>(0);
  const [apportDate, setApportDate] = useState('');
  const [apportMethod, setApportMethod] = useState<PaymentMethod>(PaymentMethod.VIREMENT);

  useEffect(() => { 
    const today = new Date().toISOString().split('T')[0];
    setTransferDate(today); 
    setApportDate(today);
  }, []);

  // Robust amount formatting
  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    const parts = Math.abs(val).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${val < 0 ? '-' : ''}${parts[0]},${parts[1]}`;
  };

  // Flatten all history entries into a single transaction list
  const allTransactions = useMemo(() => {
    const transactions: TransactionRecord[] = [];

    // 1. Process Payments (IN)
    payments.forEach(p => {
      if (p.history && p.history.length > 0) {
        p.history.forEach((h, idx) => {
          transactions.push({
            id: `in-${p.id}-${idx}`,
            date: h.date,
            label: p.invoiceNumber,
            partner: p.customerName,
            category: 'Vente',
            mode: h.method,
            amount: h.amount,
            type: 'IN'
          });
        });
      } else if (p.paidAmount > 0) {
        transactions.push({
          id: `in-init-${p.id}`,
          date: p.date,
          label: p.invoiceNumber,
          partner: p.customerName,
          category: 'Vente',
          mode: p.method || PaymentMethod.VIREMENT,
          amount: p.paidAmount,
          type: 'IN'
        });
      }
    });

    // 2. Process Apports (IN) - New dedicated collection
    apports.forEach(a => {
        transactions.push({
            id: `app-${a.id}`,
            date: a.date,
            label: a.reference,
            partner: 'Associé',
            category: 'Apport Capital',
            mode: a.method,
            amount: a.amount,
            type: 'IN'
        });
    });

    // 3. Process Charges (OUT)
    charges.forEach(c => {
      if (c.history && c.history.length > 0) {
        c.history.forEach((h, idx) => {
          transactions.push({
            id: `out-${c.id}-${idx}`,
            date: h.date,
            label: c.reference || c.description,
            partner: c.supplierName || 'Divers',
            category: c.category,
            mode: h.method,
            amount: h.amount,
            type: 'OUT'
          });
        });
      } else if (c.paidAmount > 0) {
        transactions.push({
          id: `out-init-${c.id}`,
          date: c.date,
          label: c.reference || c.description,
          partner: c.supplierName || 'Divers',
          category: c.category,
          mode: c.method,
          amount: c.paidAmount,
          type: 'OUT'
        });
      }
    });

    return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, charges, apports]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const matchStart = !dateStart || t.date >= dateStart;
      const matchEnd = !dateEnd || t.date <= dateEnd;
      const matchMode = modeFilter === 'ALL' || t.mode === modeFilter;
      return matchStart && matchEnd && matchMode;
    });
  }, [allTransactions, dateStart, dateEnd, modeFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const encaisse = filteredTransactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const decaisse = filteredTransactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
    const soldeNet = encaisse - decaisse;

    const totalCashIn = allTransactions.filter(t => t.type === 'IN' && t.mode === PaymentMethod.ESPECES).reduce((acc, t) => acc + t.amount, 0);
    const totalCashOut = allTransactions.filter(t => t.type === 'OUT' && t.mode === PaymentMethod.ESPECES).reduce((acc, t) => acc + t.amount, 0);
    const dispoCaisse = totalCashIn - totalCashOut;

    return { encaisse, decaisse, soldeNet, dispoCaisse };
  }, [filteredTransactions, allTransactions]);

  return (
    <div className="space-y-8 animate-fadeIn w-full pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200/50">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trésorerie Consolidée</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Flux financiers basés sur les règlements réels.</p>
          </div>
        </div>
        {!isReadOnly ? (
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowApportModal(true)}
              className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" /> APPORT ASSOCIÉ
            </button>
            <button 
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <ArrowUpRight className="w-5 h-5" /> DÉPOSER EN BANQUE
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-400 font-bold text-[10px] border border-slate-200 uppercase tracking-widest"><Lock className="w-3 h-3" /> Consultation</div>
        )}
      </header>

      {/* FILTER BAR */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DU</label>
          <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
        </div>
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AU</label>
          <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MODE DE PAIEMENT</label>
          <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700 appearance-none" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
            <option value="ALL">Tous les modes</option>
            <option value={PaymentMethod.ESPECES}>Espèces</option>
            <option value={PaymentMethod.VIREMENT}>Virement</option>
            <option value={PaymentMethod.CHEQUE}>Chèque</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <button onClick={() => { setDateStart(''); setDateEnd(''); setModeFilter('ALL'); }} className="w-full px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> RÉINITIALISER</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ENCAISSÉ (PÉRIODE)</p><p className="text-3xl font-black text-emerald-600 mt-4 tabular-nums">+{formatAmount(stats.encaisse)} DH</p></div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">DÉCAISSÉ (PÉRIODE)</p><p className="text-3xl font-black text-rose-600 mt-4 tabular-nums">-{formatAmount(stats.decaisse)} DH</p></div>
        <div className="bg-[#ECFDF5] p-8 rounded-[2.5rem] border border-[#D1FAE5] shadow-sm"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">DISPONIBILITÉ CAISSE</p><p className="text-3xl font-black text-emerald-900 mt-4 tabular-nums">{formatAmount(stats.dispoCaisse)} DH</p></div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">SOLDE NET PÉRIODE</p><p className="text-3xl font-black text-emerald-400 mt-4 tabular-nums">{formatAmount(stats.soldeNet)} DH</p></div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center"><h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">TRANSACTIONS RÉELLES</h3><span className="px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">{filteredTransactions.length} OPÉRATIONS FILTRÉES</span></div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-8 py-6">DATE</th><th className="px-6 py-6">OPÉRATION / TIERS</th><th className="px-6 py-6 text-center">MODE</th><th className="px-8 py-6 text-right">MONTANT DH</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-all duration-300">
                  <td className="px-8 py-6"><p className="text-xs font-bold text-slate-400 whitespace-nowrap">{t.date}</p></td>
                  <td className="px-6 py-6"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>{t.type === 'IN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}</div><div><p className="font-black text-slate-900 text-sm tracking-tight uppercase">{t.label}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.partner} • <span className={t.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}>{t.category}</span></p></div></div></td>
                  <td className="px-6 py-6 text-center"><span className="px-3 py-1.5 bg-slate-100 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-200/50">{t.mode}</span></td>
                  <td className="px-8 py-6 text-right"><p className={`text-base font-black tabular-nums ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'IN' ? '+' : '-'}{formatAmount(t.amount)}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL APPORT ASSOCIÉ */}
      {showApportModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-fadeIn border border-white/20 mb-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Apport Associé</h3>
                <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">Injection de fonds propres</p>
              </div>
              <button onClick={() => setShowApportModal(false)} className="text-slate-300 hover:text-slate-900">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant de l'apport (DH)</label>
                <input type="number" className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-black text-4xl text-center text-emerald-600 outline-none" value={apportAmount || ''} onChange={(e) => setApportAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de réception</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setApportMethod(PaymentMethod.VIREMENT)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 gap-2 ${apportMethod === PaymentMethod.VIREMENT ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><CreditCard className="w-6 h-6" /><span className="text-[10px] font-black">BANQUE (5141)</span></button>
                  <button type="button" onClick={() => setApportMethod(PaymentMethod.ESPECES)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 gap-2 ${apportMethod === PaymentMethod.ESPECES ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><Banknote className="w-6 h-6" /><span className="text-[10px] font-black">CAISSE (5161)</span></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de l'opération</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={apportDate} onChange={(e) => setApportDate(e.target.value)} />
              </div>
              <button onClick={() => { if(onCapitalIncrease) onCapitalIncrease(apportAmount, apportDate, apportMethod); setShowApportModal(false); setApportAmount(0); }} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Confirmer l'Apport</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERT BANQUE */}
      {showTransferModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-fadeIn border border-white/20 mb-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Déposer en Banque</h3>
                <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">Transfert Caisse vers Virement</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-300 hover:text-slate-900">
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant du versement (DH)</label>
                <input type="number" className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-black text-4xl text-center text-indigo-600 outline-none" value={transferAmount || ''} onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                <p className="text-[9px] text-center text-slate-400 font-bold mt-2">Disponibilité max: {formatAmount(stats.dispoCaisse)} DH</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de l'opération</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </div>
              <button onClick={() => { if (transferAmount > stats.dispoCaisse) { alert("Montant supérieur à la disponibilité en caisse."); return; } onInternalTransfer(transferAmount, transferDate); setShowTransferModal(false); setTransferAmount(0); }} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Confirmer le Versement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Treasury;
