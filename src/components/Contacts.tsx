'use client';
import React, { useState, useMemo } from 'react';
import { Entity, EntityType, Payment, Charge, PaymentStatus } from '@/lib/types';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Search, MapPin, X, Trash2, Lock, Edit3, User, Phone, Mail, Clock, CreditCard } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactsProps {
  contacts: Entity[];
  onAddContact: (contact: Omit<Entity, 'id'>) => void;
  onEditContact: (id: string, contact: Partial<Entity>) => void;
  onDeleteContact: (id: string) => void;
  payments: Payment[];
  charges: Charge[];
  isReadOnly?: boolean;
}

const Contacts: React.FC<ContactsProps> = ({ contacts, onAddContact, onEditContact, onDeleteContact, payments, charges, isReadOnly = false }) => {
  const [activeTab, setActiveTab] = useState<EntityType>('client');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Entity | null>(null);
  const [detailsContact, setDetailsContact] = useState<Entity | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '', ice: '', ifId: '', type: 'client' as EntityType
  });

  const cities = useMemo(() => {
    const list = contacts.map(c => c.city).filter((city): city is string => !!city && city.trim() !== '');
    return Array.from(new Set(list)).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchType = c.type === activeTab;
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity = selectedCity === 'all' || c.city === selectedCity;
      return matchType && matchSearch && matchCity;
    });
  }, [contacts, activeTab, searchTerm, selectedCity]);

  const getContactStats = (contact: Entity) => {
    if (contact.type === 'client') {
      const clientPayments = payments.filter(p => p.customerName === contact.name);
      const total = clientPayments.reduce((acc, p) => acc + p.amount, 0);
      const rawOutstanding = clientPayments.reduce((acc, p) => acc + (p.amount - p.paidAmount), 0);
      const outstanding = Number(Math.max(0, rawOutstanding).toFixed(2));
      return { total, outstanding, label: 'Ventes' };
    } else {
      const supplierCharges = charges.filter(c => c.supplierName === contact.name);
      const total = supplierCharges.reduce((acc, c) => acc + c.amount, 0);
      const rawOutstanding = supplierCharges.reduce((acc, c) => acc + (c.amount - c.paidAmount), 0);
      const outstanding = Number(Math.max(0, rawOutstanding).toFixed(2));
      return { total, outstanding, label: 'Achats' };
    }
  };

  const outstandingItems = useMemo(() => {
    if (!detailsContact) return { items: [], total: 0 };
    if (detailsContact.type === 'client') {
        const clientPayments = payments.filter(p => p.customerName === detailsContact.name && (p.amount - p.paidAmount) >= 0.01).map(p => ({ id: p.id, reference: p.invoiceNumber, date: p.date, amount: p.amount, outstanding: Number((p.amount - p.paidAmount).toFixed(2)) }));
        return { items: clientPayments, total: Number(clientPayments.reduce((acc, item) => acc + item.outstanding, 0).toFixed(2)) };
    } else {
        const supplierCharges = charges.filter(c => c.supplierName === detailsContact.name && (c.amount - c.paidAmount) >= 0.01).map(c => ({ id: c.id, reference: c.reference || c.description, date: c.date, amount: c.amount, outstanding: Number((c.amount - c.paidAmount).toFixed(2)) }));
        return { items: supplierCharges, total: Number(supplierCharges.reduce((acc, item) => acc + item.outstanding, 0).toFixed(2)) };
    }
  }, [detailsContact, payments, charges]);

  const historyItems = useMemo(() => {
    if (!detailsContact) return [];
    let items: any[] = [];
    if (detailsContact.type === 'client') {
      payments.filter(p => p.customerName === detailsContact.name).forEach(p => {
        p.history?.forEach(h => items.push({ ...h, reference: p.invoiceNumber }));
      });
    } else {
      charges.filter(c => c.supplierName === detailsContact.name).forEach(c => {
        c.history?.forEach(h => items.push({ ...h, reference: c.reference || c.description }));
      });
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [detailsContact, payments, charges]);

  const handleOpenAddForm = () => {
    setEditingContact(null);
    setFormData({
      name: '', email: '', phone: '', address: '', city: '', ice: '', ifId: '', type: activeTab
    });
    setShowAddForm(true);
  };

  const handleOpenEditForm = (contact: Entity) => {
    setEditingContact(contact);
    setFormData({
      ...contact,
      city: contact.city || '',
      ice: contact.ice || '',
      ifId: contact.ifId || ''
    });
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (editingContact) onEditContact(editingContact.id, formData);
    else onAddContact(formData);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Partenaires</h2><p className="text-sm text-slate-500 mt-1 font-medium">Gérez votre écosystème de clients et fournisseurs.</p></div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button onClick={() => exportToCsv(`contacts_${activeTab}.csv`, filteredContacts)} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2"><Download className="w-4 h-4" />EXPORTER CSV</button>
          {!isReadOnly && (
            <CsvImportButton
              tableName="contacts"
              schemaKeys={['name', 'type', 'email', 'phone', 'address', 'city', 'ice', 'ifId']}
              defaultValues={{ type: activeTab }}
              idPrefix="ent"
              className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
            />
          )}
          {!isReadOnly ? (
            <button onClick={handleOpenAddForm} className="flex-1 md:flex-none btn-primary flex items-center justify-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>NOUVEAU {activeTab === 'client' ? 'CLIENT' : 'FOURNISSEUR'}</button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-400 font-bold uppercase text-[10px] tracking-widest border border-slate-200"><Lock className="w-3 h-3" /> Consultation</div>
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-white shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
          <button onClick={() => setActiveTab('client')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'client' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Clients</button>
          <button onClick={() => setActiveTab('supplier')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'supplier' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Fournisseurs</button>
        </div>
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><Search className="w-4 h-4" /></div>
          <input type="text" placeholder="Recherche par nom..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="relative md:w-48 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><MapPin className="w-4 h-4" /></div>
          <select className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-sm appearance-none" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
            <option value="all">Toutes Villes</option>
            {cities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
      </div>

      {/* MOBILE VIEW: CARDS */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredContacts.map(c => {
          const stats = getContactStats(c);
          return (
            <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <button onClick={() => setDetailsContact(c)} className="font-black text-slate-800 text-left uppercase">{c.name}</button>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                      <MapPin className="w-3 h-3" /> {c.city || '---'}
                    </div>
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenEditForm(c)} className="p-2 text-slate-400"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => setContactToDelete(c.id)} className="p-2 text-slate-400"><Trash2 className="w-5 h-5" /></button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Total {stats.label}</p>
                  <p className="text-sm font-black text-slate-700">{stats.total.toLocaleString()} DH</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Encours (Reste)</p>
                  <p className={`text-sm font-black ${stats.outstanding >= 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.outstanding.toLocaleString()} DH</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {c.phone && <a href={`tel:${c.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 py-2.5 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-widest"><Phone className="w-3.5 h-3.5" /> Appeler</a>}
                {c.email && <a href={`mailto:${c.email}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 py-2.5 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-widest"><Mail className="w-3.5 h-3.5" /> Email</a>}
              </div>
            </div>
          );
        })}
        {filteredContacts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
            <p className="text-slate-400 font-medium italic">Aucun partenaire trouvé.</p>
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: TABLE */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <tr><th className="px-8 py-6">Partenaire</th><th className="px-8 py-6">Ville</th><th className="px-8 py-6 text-right">Volume d'affaires</th><th className="px-8 py-6 text-right">Encours (Reste)</th><th className="px-8 py-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContacts.map(c => {
                const stats = getContactStats(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6"><button onClick={() => setDetailsContact(c)} className="font-black text-slate-800 hover:text-blue-600 text-left transition-colors">{c.name}</button><p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{c.type}</p></td>
                    <td className="px-8 py-6"><div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><MapPin className="w-3 h-3 text-slate-300" />{c.city || '---'}</div></td>
                    <td className="px-8 py-6 text-right font-black tabular-nums text-slate-700">{stats.total.toLocaleString()} DH</td>
                    <td className="px-8 py-6 text-right"><span className={`font-black tabular-nums ${stats.outstanding >= 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.outstanding.toLocaleString()} DH</span></td>
                    <td className="px-8 py-6">
                      {!isReadOnly && (
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                          <button onClick={() => handleOpenEditForm(c)} className="p-2.5 text-slate-400 hover:text-blue-600"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => setContactToDelete(c.id)} className="p-2.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50"><div><h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingContact ? 'Modifier' : 'Nouveau'} Partenaire</h3><p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1">Type : {formData.type === 'client' ? 'Client' : 'Fournisseur'}</p></div><button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 p-2"><X className="w-6 h-6" /></button></div>
            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom / Raison Sociale</label><input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">ICE</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.ice} onChange={(e) => setFormData({...formData, ice: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">IF</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.ifId} onChange={(e) => setFormData({...formData, ifId: e.target.value})} /></div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email</label><input type="email" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ville</label><input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} /></div>
               </div>
            </div>
            <div className="p-10 bg-slate-50 flex flex-col gap-3"><button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs">Enregistrer</button></div>
          </form>
        </div>
      )}

      {detailsContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn h-auto max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{detailsContact.name}</h3>
                <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1">Relevé de compte détaillé</p>
              </div>
              <button type="button" onClick={() => setDetailsContact(null)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-10 no-scrollbar">
              {/* SECTION EN COURS */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Documents en attente de règlement</h4>
                </div>
                {outstandingItems.items.length > 0 ? (
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="px-6 py-4">Référence</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-right">Montant Total</th><th className="px-6 py-4 text-right">Reste à payer</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {outstandingItems.items.map(item => (
                          <tr key={item.id} className="text-xs hover:bg-white transition-colors">
                            <td className="px-6 py-4 font-black text-slate-700">{item.reference}</td>
                            <td className="px-6 py-4 text-slate-500 font-bold">{item.date}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-600">{item.amount.toLocaleString()} DH</td>
                            <td className="px-6 py-4 text-right font-black text-rose-600">{item.outstanding.toLocaleString()} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (<div className="py-10 text-center bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-emerald-600 font-black text-xs uppercase tracking-widest">✅ Aucun encours détecté</p></div>)}
              </div>

              {/* SECTION HISTORIQUE */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Historique des règlements effectués</h4>
                </div>
                {historyItems.length > 0 ? (
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Réf. Document</th><th className="px-6 py-4">Mode</th><th className="px-6 py-4 text-right">Montant Réglé</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyItems.map((h, idx) => (
                          <tr key={idx} className="text-xs hover:bg-white transition-colors">
                            <td className="px-6 py-4 text-slate-500 font-bold">{h.date}</td>
                            <td className="px-6 py-4 font-black text-slate-700 uppercase">{h.reference}</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600">{h.method}</span></td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">{h.amount.toLocaleString()} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (<div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-slate-400 font-bold text-xs italic">Aucun règlement enregistré à ce jour.</p></div>)}
              </div>
            </div>
            
            <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6 rounded-b-[2.8rem]">
              <div className="text-center md:text-left">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Net en cours</h4>
                <p className={`text-4xl font-black tabular-nums ${outstandingItems.total >= 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>{outstandingItems.total.toLocaleString()} <span className="text-xl opacity-50">DH</span></p>
              </div>
              <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dernier règlement</p>
                <p className="font-bold text-sm">{historyItems[0]?.date || '---'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black">Supprimer ce partenaire ?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (contactToDelete) onDeleteContact(contactToDelete); setContactToDelete(null); }} className="bg-rose-600 text-white rounded-xl font-black">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;