'use client';
import React, { useState, useMemo } from 'react';
import { Cheque, ChequeStatus } from '@/lib/types';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Edit3, X } from 'lucide-react';

interface RecouvrementProps {
  cheques: Cheque[];
  onUpdateCheque: (id: string | string[], updates: Partial<Cheque>) => void;
}

const Recouvrement: React.FC<RecouvrementProps> = ({ cheques, onUpdateCheque }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour l'édition
  const [editingCheque, setEditingCheque] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ number: '', bank: '' });

  const groupedCheques = useMemo(() => {
    const filtered = cheques.filter(c => {
      const matchType = filterType === 'ALL' || c.type === filterType;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchSearch = c.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.partnerName && c.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          c.bank.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });

    const groups: Record<string, any> = {};

    filtered.forEach(c => {
      const key = `${c.number}-${c.type}`;
      if (!groups[key]) {
        groups[key] = {
          ...c,
          ids: [c.id],
          references: [c.reference],
          partnerNames: c.partnerName ? [c.partnerName] : [],
          totalAmount: c.amount,
        };
      } else {
        groups[key].ids.push(c.id);
        groups[key].references.push(c.reference);
        if (c.partnerName && !groups[key].partnerNames.includes(c.partnerName)) {
          groups[key].partnerNames.push(c.partnerName);
        }
        groups[key].totalAmount += c.amount;
      }
    });

    return Object.values(groups).map(g => {
      const formattedRefs = g.references.map((ref: string) => {
        if (ref.startsWith('AR-')) {
          return ref.slice(-3);
        }
        return ref;
      });

      return {
        ...g,
        displayReference: Array.from(new Set(formattedRefs)).join(', '),
        displayPartner: g.partnerNames.join(' / '),
        amount: g.totalAmount
      };
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [cheques, filterType, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalIn: cheques.filter(c => c.type === 'IN').reduce((acc, c) => acc + c.amount, 0),
      totalOut: cheques.filter(c => c.type === 'OUT').reduce((acc, c) => acc + c.amount, 0),
      pendingEncaissement: cheques.filter(c => c.type === 'IN' && c.status !== ChequeStatus.CLEARED).reduce((acc, c) => acc + c.amount, 0),
      overdue: cheques.filter(c => c.status !== ChequeStatus.CLEARED && c.dueDate < today).length
    };
  }, [cheques]);

  const getStatusColor = (status: ChequeStatus) => {
    switch (status) {
      case ChequeStatus.RECEIVED: return 'bg-blue-100 text-blue-700';
      case ChequeStatus.DEPOSITED: return 'bg-amber-100 text-amber-700';
      case ChequeStatus.CLEARED: return 'bg-emerald-100 text-emerald-700';
      case ChequeStatus.BOUNCED: return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleEditClick = (group: any) => {
    setEditingCheque(group);
    setEditFormData({ number: group.number, bank: group.bank });
  };

  const handleSaveEdit = () => {
    if (editingCheque) {
      onUpdateCheque(editingCheque.ids, editFormData);
      setEditingCheque(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn w-full pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recouvrement Chèques</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Suivi rigoureux des encaissements et décaissements par chèque.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={() => exportToCsv('cheques.csv', groupedCheques)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter CSV
            </button>
            <CsvImportButton
                tableName="cheques"
                schemaKeys={['number', 'bank', 'amount', 'dueDate', 'status', 'type']}
                idPrefix="chq"
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
            />
            <div className="flex items-center gap-3 bg-white/50 p-2 rounded-3xl border border-white">
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${stats.overdue > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    {stats.overdue} Échéances passées
                </div>
            </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bento-card p-6 bg-white border-l-4 border-l-blue-600">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Chèques Clients</p>
           <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalIn.toLocaleString()} DH</p>
           <p className="text-[9px] text-slate-400 mt-2 font-bold italic">Chèques reçus de vos partenaires clients</p>
        </div>
        <div className="bento-card p-6 bg-white border-l-4 border-l-amber-600">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En attente d'encaissement</p>
           <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingEncaissement.toLocaleString()} DH</p>
           <p className="text-[9px] text-slate-400 mt-2 font-bold italic">Montant total des chèques non encore encaissés</p>
        </div>
        <div className="bento-card p-6 bg-white border-l-4 border-l-rose-600">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Chèques Fournisseurs</p>
           <p className="text-2xl font-black text-rose-600 mt-1">{stats.totalOut.toLocaleString()} DH</p>
           <p className="text-[9px] text-slate-400 mt-2 font-bold italic">Chèques émis pour vos achats et charges</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 p-4 rounded-[2.5rem] border border-white/80 shadow-sm backdrop-blur-sm">
        <div className="md:col-span-1 relative">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="N° Chèque, Banque, Tiers..." className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button onClick={() => setFilterType('ALL')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Tous</button>
           <button onClick={() => setFilterType('IN')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'IN' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Clients</button>
           <button onClick={() => setFilterType('OUT')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'OUT' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>Fournis.</button>
        </div>

        <select className="w-full px-4 py-3 bg-white font-black text-[10px] uppercase tracking-widest border border-slate-100 rounded-2xl outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {Object.values(ChequeStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterType('ALL'); }} className="px-4 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Réinitialiser</button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">N° Chèque / Banque</th>
                <th className="px-8 py-5">Échéance</th>
                <th className="px-8 py-5">Tiers / Source</th>
                <th className="px-8 py-5 text-center">Statut</th>
                <th className="px-8 py-5 text-right">Montant</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedCheques.map((c) => {
                const isOverdue = c.status !== ChequeStatus.CLEARED && c.dueDate < new Date().toISOString().split('T')[0];
                return (
                  <tr key={`${c.number}-${c.type}`} className={`hover:bg-slate-50 transition-colors group ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${c.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                           {c.type === 'IN' ? '↓' : '↑'}
                         </div>
                         <div>
                           <p className="font-black text-slate-800">{c.number}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{c.bank}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <p className={`text-xs font-black ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>{c.dueDate}</p>
                       {isOverdue && <span className="text-[8px] font-black text-rose-500 uppercase">Échéance passée</span>}
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-sm font-bold text-slate-800">{c.displayPartner}</p>
                       <p className="text-[10px] text-blue-500 font-black uppercase">{c.displayReference}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusColor(c.status)}`}>
                         {c.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black tabular-nums text-slate-900">
                      {c.amount.toLocaleString()} DH
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex justify-center items-center gap-2">
                          <button onClick={() => handleEditClick(c)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all" title="Modifier numéro/banque">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {c.status === ChequeStatus.RECEIVED && (
                            <button 
                              onClick={() => onUpdateCheque(c.ids, { status: ChequeStatus.DEPOSITED })}
                              className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-sm"
                            >
                              Déposer
                            </button>
                          )}
                          {(c.status === ChequeStatus.RECEIVED || c.status === ChequeStatus.DEPOSITED) && (
                            <button 
                              onClick={() => onUpdateCheque(c.ids, { status: ChequeStatus.CLEARED })}
                              className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                            >
                              Encaisser
                            </button>
                          )}
                          {c.status !== ChequeStatus.CLEARED && c.status !== ChequeStatus.BOUNCED && (
                            <button 
                              onClick={() => onUpdateCheque(c.ids, { status: ChequeStatus.BOUNCED })}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                              title="Impayé"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </button>
                          )}
                          {(c.status === ChequeStatus.BOUNCED || c.status === ChequeStatus.CLEARED) && (
                            <button
                              onClick={() => onUpdateCheque(c.ids, { status: ChequeStatus.RECEIVED })}
                              className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-all"
                              title="Remettre à l'état Reçu"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6-6m-6 6l6 6"></path></svg>
                            </button>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
              {groupedCheques.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                    Aucun chèque enregistré dans cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'édition du chèque */}
      {editingCheque && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Modifier Chèque</h3>
                <p className="text-blue-600 font-bold text-xs uppercase mt-1">Montant : {editingCheque.amount.toLocaleString()} DH</p>
              </div>
              <button onClick={() => setEditingCheque(null)} className="text-slate-300 hover:text-slate-900">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro du chèque</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" 
                  value={editFormData.number} 
                  onChange={(e) => setEditFormData({...editFormData, number: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banque émettrice</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" 
                  value={editFormData.bank} 
                  onChange={(e) => setEditFormData({...editFormData, bank: e.target.value})} 
                />
              </div>
              <button 
                onClick={handleSaveEdit}
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 mt-4"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recouvrement;
