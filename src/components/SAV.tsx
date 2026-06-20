'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { SAVTicket, SAVStatus, Entity, Product, Charge, PaymentMethod } from '@/lib/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Trash2, X, FileText, Edit3, Lock } from 'lucide-react';
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

interface SAVProps {
  tickets: SAVTicket[];
  clients: Entity[];
  products: Product[];
  onCreateTicket: (ticket: Omit<SAVTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTicket: (id: string, updates: Partial<SAVTicket>) => void;
  onDeleteTicket: (id: string) => void;
  onAddCharge: (charge: Omit<Charge, 'id' | 'paidAmount' | 'status'>) => void;
  isReadOnly?: boolean;
}

const SAV: React.FC<SAVProps> = ({ tickets, clients, products, onCreateTicket, onUpdateTicket, onDeleteTicket, onAddCharge, isReadOnly = false }) => {
  const [selectedTicket, setSelectedTicket] = useState<SAVTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tempCost, setTempCost] = useState<number>(0);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: '', productId: '', description: '', status: SAVStatus.NEW, date: ''
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => filterStatus === 'all' || t.status === filterStatus);
  }, [tickets, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      new: tickets.filter(t => t.status === SAVStatus.NEW).length,
      repair: tickets.filter(t => t.status === SAVStatus.REPAIR).length,
      exchange: tickets.filter(t => t.status === SAVStatus.EXCHANGE).length,
    };
  }, [tickets]);

  const getStatusBadge = (status: SAVStatus) => {
    switch (status) {
      case SAVStatus.NEW: return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase">Nouveau</span>;
      case SAVStatus.DIAGNOSTIC: return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase">Diagnostic</span>;
      case SAVStatus.REPAIR: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">Réparation</span>;
      case SAVStatus.EXCHANGE: return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase">Échange</span>;
      case SAVStatus.CLOSED: return <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">Clôturé</span>;
      default: return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const client = clients.find(c => c.id === formData.clientId);
    const product = products.find(p => p.id === formData.productId);
    if (!client || !product) return;
    onCreateTicket({
      clientId: client.id, clientName: client.name, productId: product.id, productName: product.name,
      description: formData.description, status: formData.status
    });
    setFormData({ ...formData, clientId: '', productId: '', description: '' });
  };

  const formatCurrencyForPDF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const generatePDF = (ticket: SAVTicket) => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === ticket.clientId);
    doc.setFillColor(244, 63, 94); doc.roundedRect(14, 15, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("TP", 16, 23);
    doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text("TRADING PARTNERSHIPS S.A.R.L", 30, 23);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
    doc.text("ICE : 003338833000011 - RC : 591271 - IF : 53894480", 30, 28);
    
    doc.setFontSize(14); doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "bold"); 
    doc.text("DOSSIER DE RÉPARATION / SAV", 196, 23, { align: 'right' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
    doc.text(`N° Dossier: ${ticket.ticketNumber}`, 196, 30, { align: 'right' }); 
    doc.text(`Date Création: ${ticket.createdAt}`, 196, 35, { align: 'right' }); 
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 45, 196, 45);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("CLIENT :", 14, 55);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.text(ticket.clientName, 14, 61);
    
    autoTable(doc, {
      startY: 90, head: [['Produit concerné', 'Marque', 'Problème déclaré', 'Frais estimés']],
      body: [[ticket.productName, products.find(p => p.id === ticket.productId)?.sku || "N/A", ticket.description, formatCurrencyForPDF(ticket.cost || 0) + " DH"]],
      theme: 'grid', headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
    });

    doc.save(`SAV_${ticket.ticketNumber}.pdf`);
  };

  const handleApplyCost = () => {
    if (!selectedTicket || tempCost <= 0 || isReadOnly) return;
    onAddCharge({ description: `Frais Réparation ${selectedTicket.ticketNumber}`, category: 'SAV', amount: tempCost, date: new Date().toISOString().split('T')[0], method: PaymentMethod.ESPECES });
    onUpdateTicket(selectedTicket.id, { cost: (selectedTicket.cost || 0) + tempCost });
    setSelectedTicket({ ...selectedTicket, cost: (selectedTicket.cost || 0) + tempCost });
    setTempCost(0);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg"><Edit3 className="w-6 h-6 text-rose-600" /></div>
            Service Après-Vente
          </h2>
          <p className="text-slate-500 md:pl-12">Suivez les retours, réparations et garanties clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportToCsv('tickets_sav.csv', filteredTickets)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase flex items-center gap-2"><Download className="w-4 h-4" />CSV</button>
          {!isReadOnly && (
            <CsvImportButton
              tableName="savtickets"
              schemaKeys={['ticketNumber', 'clientName', 'productName', 'description', 'status', 'createdAt']}
              idPrefix="sav"
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
            />
          )}
          {isReadOnly && <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-400 font-bold text-[10px] border border-slate-200 uppercase tracking-widest"><Lock className="w-3 h-3" /> Consultation</div>}
        </div>
      </header>

      {!isReadOnly && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 text-slate-800">Nouveau Dossier SAV</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label><input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required /></div>
            <div className="space-y-1.5 md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</label><select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} required><option value="">Choisir...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="space-y-1.5 md:col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produit</label><select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.productId} onChange={(e) => setFormData({...formData, productId: e.target.value})} required><option value="">Choisir...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="space-y-1.5 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Panne</label><input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required /></div>
            <button type="submit" className="bg-rose-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase h-[38px]">Créer</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
              <tr><th className="px-6 py-4">N° Dossier</th><th className="px-6 py-4">Client</th><th className="px-6 py-4">Produit</th><th className="px-6 py-4 text-center">Statut</th><th className="px-6 py-4 text-right">Frais</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-black text-slate-900">{t.ticketNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{t.clientName}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{t.productName}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(t.status)}</td>
                  <td className="px-6 py-4 font-bold text-rose-600 text-right">{t.cost?.toLocaleString() || 0} DH</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => generatePDF(t)} className="text-slate-400 hover:text-rose-600 p-2"><FileText className="w-5 h-5" /></button>
                      <button onClick={() => setSelectedTicket(t)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">Détails</button>
                      {!isReadOnly && <button onClick={() => setTicketToDelete(t.id)} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn h-auto max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="text-xl font-bold">Dossier {selectedTicket.ticketNumber}</h3><button onClick={() => setSelectedTicket(null)} className="text-slate-400 p-2"><X className="w-6 h-6" /></button></div>
            <div className="p-6 space-y-6 overflow-y-auto">
              {!isReadOnly && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100"><h4 className="text-[10px] font-black text-rose-600 uppercase mb-3">Ajouter Frais</h4><div className="flex items-end gap-3"><input type="number" className="flex-1 px-3 py-2 bg-white border rounded-xl font-bold" value={tempCost} onChange={(e) => setTempCost(parseFloat(e.target.value) || 0)} /><button onClick={handleApplyCost} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black h-[38px]">Valider</button></div></div>
              )}
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Statut</label><select disabled={isReadOnly} className="w-full px-4 py-2.5 border rounded-xl font-bold" value={selectedTicket.status} onChange={(e) => { const newStatus = e.target.value as SAVStatus; onUpdateTicket(selectedTicket.id, { status: newStatus }); setSelectedTicket({...selectedTicket, status: newStatus}); }}>{Object.values(SAVStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase">Note technique</label><textarea readOnly={isReadOnly} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none text-sm h-24" value={selectedTicket.solution || ''} onChange={(e) => { if(!isReadOnly) { const sol = e.target.value; onUpdateTicket(selectedTicket.id, { solution: sol }); setSelectedTicket({...selectedTicket, solution: sol}); }}} /></div>
            </div>
            <div className="p-6 bg-slate-50"><button onClick={() => setSelectedTicket(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">Fermer</button></div>
          </div>
        </div>
      )}

      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader><AlertDialogTitle className="font-black">Supprimer ce dossier SAV ?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { if (ticketToDelete) { onDeleteTicket(ticketToDelete); setTicketToDelete(null); } }} className="bg-rose-600 text-white rounded-xl font-black">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SAV;
