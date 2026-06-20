'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Entity, StockEntry, StockEntryItem, SupplierAdvance, PaymentMethod } from '@/lib/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, FileText, Upload, X, Eye, Trash2, Lock, Edit3, Plus, Banknote, CreditCard, ClipboardList, Wallet, History, Search, CheckCircle2 } from 'lucide-react';
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

interface StockEntriesProps {
  products: Product[];
  suppliers: Entity[];
  entries: StockEntry[];
  advances: SupplierAdvance[];
  onCreateEntry: (entry: Omit<StockEntry, 'id' | 'entryNumber' | 'purchaseOrderNumber'>, advanceIds: string[]) => void;
  onUpdateEntry?: (id: string, entry: Partial<StockEntry>) => void;
  onDeleteEntry: (entryId: string, entryNumber: string) => void;
  onCreateAdvance: (advance: Omit<SupplierAdvance, 'id' | 'status'>) => void;
  onDeleteAdvance: (id: string) => void;
  onNavigateToFinance: () => void;
  isReadOnly?: boolean;
}

const StockEntries: React.FC<StockEntriesProps> = ({ 
  products, suppliers, entries, advances = [], onCreateEntry, onUpdateEntry, onDeleteEntry, onCreateAdvance, onDeleteAdvance, onNavigateToFinance, isReadOnly = false 
}) => {
  const [activeTab, setActiveTab] = useState<'arrivages' | 'advances'>('arrivages');
  
  const csvImportConfig = useMemo(() => {
    if (activeTab === 'arrivages') {
      return {
        tableName: 'stockentries',
        schemaKeys: ['entryNumber', 'totalTTC', 'date', 'supplierId', 'supplierName', 'attachmentUrl', 'items'],
        idPrefix: 'ste'
      };
    } else {
      return {
        tableName: 'supplieradvances',
        schemaKeys: ['date', 'supplierId', 'supplierName', 'amount', 'method', 'description', 'status', 'linkedEntryNumber'],
        idPrefix: 'adv'
      };
    }
  }, [activeTab]);
  
  // States for Arrivages
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [costPriceTTC, setCostPriceTTC] = useState(0);
  const [entryDate, setEntryDate] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{id: string, number: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptItems, setReceiptItems] = useState<StockEntryItem[]>([]);
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);

  // States for Supplier Advances
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [advanceSupplierId, setAdvanceSupplierId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceDate, setAdvanceDate] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>(PaymentMethod.VIREMENT);
  const [advanceDesc, setAdvanceDesc] = useState('');
  const [advanceToDelete, setAdvanceToDelete] = useState<string | null>(null);

  useEffect(() => { 
    const today = new Date().toISOString().split('T')[0];
    setEntryDate(today); 
    setAdvanceDate(today);
  }, []);

  // Filter available advances for the current supplier
  const availableAdvances = useMemo(() => {
    if (!selectedSupplierId) return [];
    return advances.filter(a => a.supplierId === selectedSupplierId && a.status === 'DISPONIBLE');
  }, [advances, selectedSupplierId]);

  const totalUsedAdvances = useMemo(() => {
    return advances
      .filter(a => selectedAdvanceIds.includes(a.id))
      .reduce((sum, a) => sum + a.amount, 0);
  }, [advances, selectedAdvanceIds]);

  const addItem = () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct || quantity <= 0 || costPriceTTC <= 0 || isReadOnly) return;
    setReceiptItems([...receiptItems, { 
      productId: selectedProduct.id, 
      productName: selectedProduct.name, 
      sku: selectedProduct.sku, 
      quantity, 
      costPrice: costPriceTTC / 1.20 
    }]);
    setSelectedProductId(''); setQuantity(1); setCostPriceTTC(0);
  };

  const updateItem = (index: number, field: 'quantity' | 'costPrice', value: number) => {
    const updated = [...receiptItems];
    if (field === 'costPrice') {
        updated[index] = { ...updated[index], costPrice: value / 1.20 };
    } else {
        updated[index] = { ...updated[index], [field]: value };
    }
    setReceiptItems(updated);
  };

  const removeItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isReadOnly) {
      if (file.size > 1024 * 1024) {
        alert("Le fichier est trop volumineux (max 1Mo)");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => { setAttachment(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const totalTTC = useMemo(() => {
    return receiptItems.reduce((acc, item) => acc + (item.costPrice * 1.20 * item.quantity), 0);
  }, [receiptItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!selectedSupplierId) { alert("Veuillez sélectionner un fournisseur."); return; }
    if (receiptItems.length === 0) { alert("Veuillez ajouter au moins un produit à l'arrivage."); return; }
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) return;

    if (editingEntry) {
      onUpdateEntry?.(editingEntry.id, {
        items: receiptItems,
        totalHT: totalTTC / 1.20,
        totalTTC,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        date: entryDate,
        attachmentUrl: attachment || editingEntry.attachmentUrl || null
      });
      setEditingEntry(null);
    } else {
      onCreateEntry({ 
        items: receiptItems, 
        totalHT: totalTTC / 1.20, 
        totalTTC, 
        supplierId: selectedSupplier.id, 
        supplierName: selectedSupplier.name, 
        date: entryDate, 
        attachmentUrl: attachment || null 
      }, selectedAdvanceIds);
    }
    setReceiptItems([]); setSelectedSupplierId(''); setAttachment(null); setFileName(null); setSelectedAdvanceIds([]);
  };

  const startEdit = (entry: StockEntry) => {
    setEditingEntry(entry);
    setReceiptItems(entry.items);
    setSelectedSupplierId(entry.supplierId);
    setEntryDate(entry.date);
    setFileName(entry.attachmentUrl ? 'Fichier existant' : null);
    setAttachment(null);
    setSelectedAdvanceIds([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAdvance = (id: string) => {
    setSelectedAdvanceIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const supplier = suppliers.find(s => s.id === advanceSupplierId);
    if (!supplier) { alert("Veuillez sélectionner un fournisseur."); return; }
    if (advanceAmount <= 0) { alert("Montant invalide."); return; }

    onCreateAdvance({
      date: advanceDate,
      supplierId: supplier.id,
      supplierName: supplier.name,
      amount: advanceAmount,
      method: advanceMethod,
      description: advanceDesc
    });

    setShowAddAdvanceModal(false);
    setAdvanceAmount(0);
    setAdvanceDesc('');
    setAdvanceSupplierId('');
  };

  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    const parts = Math.abs(val).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${val < 0 ? '-' : ''}${parts[0]},${parts[1]}`;
  };

  const generateReceptionPDF = (entry: StockEntry) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const supplier = suppliers.find(s => s.id === entry.supplierId);

    doc.setFillColor(59, 130, 246);
    doc.roundedRect(14, 15, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("TP", 16, 23);
    doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text("TRADING PARTNERSHIPS S.A.R.L", 30, 23);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
    doc.text("ICE : 003338833000011 - RC : 591271 - IF : 53894480", 30, 28);
    
    doc.setFontSize(14); doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "bold"); 
    doc.text("BON DE COMMANDE / RÉCEPTION", 196, 23, { align: 'right' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
    doc.text(`N° BC: ${entry.entryNumber}`, 196, 30, { align: 'right' }); 
    doc.text(`Date: ${entry.date}`, 196, 35, { align: 'right' }); 
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 45, 196, 45);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("FOURNISSEUR :", 14, 55);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.text(entry.supplierName.toUpperCase(), 14, 61);
    if (supplier) {
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
      if (supplier.ice) doc.text(`ICE: ${supplier.ice}`, 14, 67);
      if (supplier.ifId) doc.text(`IF: ${supplier.ifId}`, 14, 72);
    }

    autoTable(doc, {
      startY: 85,
      head: [['Produit', 'Qté', 'P.U. TTC', 'Total TTC']],
      body: entry.items.map(i => [i.productName, i.quantity.toString(), formatAmount(i.costPrice * 1.20), formatAmount(i.costPrice * 1.20 * i.quantity)]),
      theme: 'grid', headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setTextColor(59, 130, 246); doc.setFont("helvetica", "bold");
    doc.text("TOTAL TTC :", 80, finalY); doc.text(`${formatAmount(entry.totalTTC)} DH`, 190, finalY, { align: 'right' });

    const centerX = pageWidth / 2; const stampY = pageHeight - 70;
    doc.setTextColor(0, 32, 96); doc.setFont("courier", "bold"); doc.setFontSize(11);
    doc.text("TRADING PARTNERSHIPS S.A.R.L", centerX, stampY, { align: 'center', angle: -2 });
    doc.setFontSize(8); doc.setFont("courier", "normal");
    doc.text("ICE: 003338833000011", centerX, stampY + 5, { align: 'center', angle: -2 });
    doc.text("IF: 53894480", centerX, stampY + 9, { align: 'center', angle: -2 });
    doc.text("Tél: 06 79 41 48 46", centerX, stampY + 13, { align: 'center', angle: -2 });

    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240); doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
    doc.text("TRADING PARTNERSHIPS S.A.R.L - ICE : 003338833000011 - RC : 591271 - PATENTE : 34105287 - IF : 53894480 - CNSS : 4930787", pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text("ANGL RUE PRINCE MY ABDELLAH ET RUE NAKHLA IMM 1 ETG 4 APPT 7 20000 / CASABLANCA", pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text("Tel : 06 79 41 48 46 - E-mail : contact@sivirappliances.com", pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`BC_${entry.entryNumber}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Arrivages & Achats</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Gérez vos réceptions et vos avances fournisseurs.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {activeTab === 'advances' && !isReadOnly && (
                <button onClick={() => setShowAddAdvanceModal(true)} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
                  <Wallet className="w-4 h-4" /> Nouvelle Avance
                </button>
              )}
              <button onClick={() => exportToCsv(activeTab === 'arrivages' ? 'entrees.csv' : 'avances.csv', activeTab === 'arrivages' ? entries : advances)} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />EXPORTER CSV
              </button>
              {!isReadOnly && (
                <CsvImportButton
                  tableName={csvImportConfig.tableName}
                  schemaKeys={csvImportConfig.schemaKeys}
                  idPrefix={csvImportConfig.idPrefix}
                  className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 active:scale-95"
                />
              )}
              <div className="flex bg-white p-1 rounded-full border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('arrivages')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'arrivages' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-slate-400'}`}>Arrivages (BC)</button>
                <button onClick={() => setActiveTab('advances')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'advances' ? 'bg-emerald-50 text-emerald-600 shadow-inner' : 'text-slate-400'}`}>Avances</button>
              </div>
            </div>
        </header>

      {activeTab === 'arrivages' && (
        <div className="space-y-8">
          {!isReadOnly && (
            <div className={`bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border space-y-8 ${editingEntry ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-50'}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">{editingEntry ? `Modification du BC ${editingEntry.entryNumber}` : 'Nouvel Arrivage (BC)'}</h3>
                {editingEntry && <button onClick={() => { setEditingEntry(null); setReceiptItems([]); setSelectedSupplierId(''); setAttachment(null); setFileName(null); setSelectedAdvanceIds([]); }} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE RÉCEPTION</label><input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FOURNISSEUR</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 appearance-none" value={selectedSupplierId} onChange={(e) => { setSelectedSupplierId(e.target.value); setSelectedAdvanceIds([]); }}><option value="">Choisir Fournisseur...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">JUSTIFICATIF (IMAGE/PDF)</label><button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-emerald-50 border border-dashed border-emerald-200 rounded-2xl text-emerald-700 text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">{fileName ? <span className="truncate">{fileName}</span> : <><Upload className="w-4 h-4" /> Uploader Facture</>}</button><input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} /></div>
              </div>

              {/* Advances Selection Section */}
              {availableAdvances.length > 0 && !editingEntry && (
                <div className="p-6 bg-emerald-50/30 rounded-[2rem] border border-emerald-100 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Avances Disponibles</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableAdvances.map(adv => (
                      <button 
                        key={adv.id} 
                        type="button"
                        onClick={() => toggleAdvance(adv.id)}
                        className={`p-4 rounded-2xl border flex flex-col gap-1 transition-all text-left relative ${selectedAdvanceIds.includes(adv.id) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'}`}
                      >
                        {selectedAdvanceIds.includes(adv.id) && <CheckCircle2 className="w-4 h-4 absolute top-3 right-3" />}
                        <p className="text-[9px] font-black uppercase opacity-70">{adv.date}</p>
                        <p className="text-lg font-black">{formatAmount(adv.amount)} DH</p>
                        <p className="text-[8px] font-bold truncate opacity-80">{adv.description || 'Avance sans description'}</p>
                      </button>
                    ))}
                  </div>
                  {selectedAdvanceIds.length > 0 && (
                    <div className="flex justify-between items-center pt-2 px-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Total avances sélectionnées :</p>
                      <p className="text-lg font-black text-emerald-700">{formatAmount(totalUsedAdvances)} DH</p>
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 bg-blue-50/20 rounded-[2.5rem] border border-blue-100/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-6 space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">PRODUIT À STOCKER</label><select className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl outline-none font-bold text-slate-700" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}><option value="">Choisir un article...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></div>
                  <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">QUANTITÉ</label><input type="number" min="1" className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl font-black text-slate-700 text-center" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} /></div>
                  <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">P.U. TTC (DH)</label><input type="number" step="0.01" className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl font-black text-slate-700 text-center" value={costPriceTTC || ''} onChange={(e) => setCostPriceTTC(parseFloat(e.target.value) || 0)} /></div>
                  <div className="md:col-span-2"><button onClick={addItem} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">AJOUTER</button></div>
                </div>

                {receiptItems.length > 0 && (
                  <div className="mt-4 overflow-hidden border border-blue-100 rounded-2xl bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-blue-50/50 text-[9px] font-black text-blue-600 uppercase">
                        <tr><th className="px-4 py-3">Article</th><th className="px-4 py-3 text-center">Qté</th><th className="px-4 py-3 text-right">P.U. TTC</th><th className="px-4 py-3 text-right">Total TTC</th><th className="px-4 py-3 text-center">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {receiptItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3"><p className="font-bold text-slate-800">{item.productName}</p><p className="text-[10px] text-slate-400 font-medium">{item.sku}</p></td>
                            <td className="px-4 py-3 text-center"><input type="number" className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-slate-700 outline-none focus:border-blue-400" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} /></td>
                            <td className="px-4 py-3 text-right"><input type="number" step="0.01" className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-black text-emerald-600 outline-none focus:border-emerald-400" value={(item.costPrice * 1.20).toFixed(2)} onChange={(e) => updateItem(idx, 'costPrice', parseFloat(e.target.value) || 0)} /></td>
                            <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">{formatAmount(item.costPrice * 1.20 * item.quantity)}</td>
                            <td className="px-4 py-3 text-center"><button onClick={() => removeItem(idx)} className="p-1.5 text-rose-300 hover:text-rose-600 transition-colors"><X className="w-4 h-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {receiptItems.length > 0 && (
                <div className="flex flex-col md:flex-row justify-between items-center p-8 bg-slate-900 rounded-[2.5rem] text-white animate-fadeIn gap-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Total TTC Réception</p>
                    <h4 className="text-4xl font-black tabular-nums">{formatAmount(totalTTC)} <span className="text-xl opacity-50 font-bold">DH</span></h4>
                    {selectedAdvanceIds.length > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Reste Net à payer : {formatAmount(Math.max(0, totalTTC - totalUsedAdvances))} DH</p>
                    )}
                  </div>
                  <button onClick={handleSubmit} className="w-full md:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
                    {editingEntry ? "METTRE À JOUR LE BC" : "VALIDER ET STOCKER L'ACHAT"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <History className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">HISTORIQUE DES ARRIVAGES (BC)</h3>
                </div>
                <span className="px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">{entries.length} BONS DE COMMANDE</span>
            </div>
            <div className="table-container">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="px-10 py-6">RÉFÉRENCE BC</th><th className="px-6 py-6">DATE</th><th className="px-6 py-6">FOURNISSEUR</th><th className="px-6 py-6 text-right">TOTAL TTC</th><th className="px-10 py-6 text-right">ACTIONS</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entries.slice().reverse().map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-all duration-300 group">
                      <td className="px-10 py-6 font-black text-slate-900 tracking-tight text-base uppercase">{e.entryNumber}</td>
                      <td className="px-6 py-6 text-xs font-bold text-slate-400 whitespace-nowrap">{e.date}</td>
                      <td className="px-6 py-6"><span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-600 border border-slate-200/50">{e.supplierName}</span></td>
                      <td className="px-6 py-6 text-right font-black text-slate-900 tabular-nums text-lg">{formatAmount(e.totalTTC)} <span className="text-[10px] opacity-50 ml-1">DH</span></td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(e)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Modifier"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => generateReceptionPDF(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Télécharger PDF"><FileText className="w-5 h-5" /></button>
                          {e.attachmentUrl && (
                            <button onClick={() => window.open(e.attachmentUrl)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Voir justificatif">
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                          {!isReadOnly && (
                            <button onClick={() => setEntryToDelete({id: e.id, number: e.entryNumber})} className="p-2 text-rose-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-medium italic">Aucun Bon de Commande enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advances' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm relative overflow-hidden">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Avances Versées</p>
              <p className="text-3xl md:text-4xl font-black text-slate-900 mt-4 tabular-nums">{formatAmount(advances.reduce((acc, a) => acc + a.amount, 0))} <span className="text-xl">DH</span></p>
            </div>
            <div className="bg-[#ECFDF5] p-8 rounded-[2.5rem] border border-[#D1FAE5] shadow-sm relative overflow-hidden">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Avances Disponibles</p>
              <p className="text-3xl md:text-4xl font-black text-[#059669] mt-4 tabular-nums">{formatAmount(advances.filter(a => a.status === 'DISPONIBLE').reduce((acc, a) => acc + a.amount, 0))} <span className="text-xl">DH</span></p>
            </div>
            <div className="bg-[#FFF1F2] p-8 rounded-[2.5rem] border border-[#FFE4E6] shadow-sm relative overflow-hidden">
              <p className="text-[9px] font-black text-[#E11D48] uppercase tracking-[0.2em]">Avances Utilisées</p>
              <p className="text-3xl md:text-4xl font-black text-[#E11D48] mt-4 tabular-nums">{formatAmount(advances.filter(a => a.status === 'UTILISÉE').reduce((acc, a) => acc + a.amount, 0))} <span className="text-xl">DH</span></p>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">LISTE DES AVANCES FOURNISSEURS</h3>
                </div>
                {!isReadOnly && (
                  <button onClick={() => setShowAddAdvanceModal(true)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md">
                    <Plus className="w-4 h-4" /> NOUVELLE AVANCE
                  </button>
                )}
            </div>
            <div className="table-container">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="px-10 py-6">DATE</th><th className="px-6 py-6">FOURNISSEUR</th><th className="px-6 py-6">MODE</th><th className="px-6 py-6 text-center">STATUT</th><th className="px-6 py-6 text-right">MONTANT</th><th className="px-10 py-6 text-right">ACTIONS</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {advances.slice().reverse().map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-all duration-300">
                      <td className="px-10 py-6 text-xs font-bold text-slate-400 whitespace-nowrap">{a.date}</td>
                      <td className="px-6 py-6"><span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-600 border border-slate-200/50">{a.supplierName}</span></td>
                      <td className="px-6 py-6"><p className="text-[10px] font-black text-slate-500 uppercase">{a.method}</p></td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${a.status === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-600' : a.status === 'UTILISÉE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right font-black text-slate-900 tabular-nums text-lg">{formatAmount(a.amount)} <span className="text-[10px] opacity-50 ml-1">DH</span></td>
                      <td className="px-10 py-6 text-right">
                        {!isReadOnly && a.status === 'DISPONIBLE' && (
                          <button onClick={() => setAdvanceToDelete(a.id)} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {advances.length === 0 && (
                    <tr><td colSpan={6} className="px-10 py-20 text-center text-slate-400 font-medium italic">Aucune avance enregistrée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE AVANCE */}
      {showAddAdvanceModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <form onSubmit={handleAdvanceSubmit} className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-lg shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nouvelle Avance</h3>
                <p className="text-emerald-600 font-bold text-xs uppercase mt-1">Paiement anticipé fournisseur</p>
              </div>
              <button type="button" onClick={() => setShowAddAdvanceModal(false)} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FOURNISSEUR</label>
                <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={advanceSupplierId} onChange={(e) => setAdvanceSupplierId(e.target.value)}>
                  <option value="">Sélectionner Fournisseur...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE DU VERSEMENT</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MONTANT (DH)</label>
                  <input type="number" step="0.01" required className="w-full px-5 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none font-black text-emerald-600 text-lg" value={advanceAmount || ''} onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MODE DE RÈGLEMENT</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setAdvanceMethod(PaymentMethod.ESPECES)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${advanceMethod === PaymentMethod.ESPECES ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><Banknote className="w-5 h-5" /><span className="text-[8px] font-black">ESPÈCES</span></button>
                  <button type="button" onClick={() => setAdvanceMethod(PaymentMethod.VIREMENT)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${advanceMethod === PaymentMethod.VIREMENT ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><CreditCard className="w-5 h-5" /><span className="text-[8px] font-black">VIREMENT</span></button>
                  <button type="button" onClick={() => setAdvanceMethod(PaymentMethod.CHEQUE)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${advanceMethod === PaymentMethod.CHEQUE ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><ClipboardList className="w-5 h-5" /><span className="text-[8px] font-black">CHÈQUE</span></button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NOTES / COMMENTAIRES</label>
                <textarea className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm h-24 resize-none" value={advanceDesc} onChange={(e) => setAdvanceDesc(e.target.value)} placeholder="Détail de l'avance..." />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100">
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Enregistrer l'Avance</button>
            </div>
          </form>
        </div>
      )}

      {/* ALERT DIALOGS */}
      <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-600"><Trash2 className="w-8 h-8" /></div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Supprimer le BC ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">Cette action est définitive. Le stock sera réajusté à la baisse et la dette fournisseur liée sera supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (entryToDelete) onDeleteEntry(entryToDelete.id, entryToDelete.number); setEntryToDelete(null); }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200">Confirmer Suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!advanceToDelete} onOpenChange={() => setAdvanceToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-600"><Trash2 className="w-8 h-8" /></div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Supprimer l'Avance ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">Cette avance sera définitivement supprimée de vos registres et de votre trésorerie.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (advanceToDelete) onDeleteAdvance(advanceToDelete); setAdvanceToDelete(null); }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200">Confirmer Suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockEntries;
