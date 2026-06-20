'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Payment, PaymentStatus, PaymentMethod, Charge, Entity, Cheque, ChequeStatus, InvoiceItem, Product, StockEntry, StockEntryItem, Apport } from '@/lib/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Trash2, FileText, Lock, X, Search, RotateCcw, Plus, Banknote, CreditCard, ClipboardList, Clock, History as HistoryIcon, Edit3, ShoppingCart, Package, Wallet } from 'lucide-react';
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

interface PaymentsProps {
  payments: Payment[];
  onUpdatePayment: (id: string, updates: Partial<Payment>) => void;
  onDeletePayment: (id: string) => void;
  charges: Charge[];
  onUpdateCharge: (id: string, updates: Partial<Charge>) => void;
  onAddCharge: (charge: Omit<Charge, 'id' | 'paidAmount' | 'status'>) => void;
  onDeleteCharge: (id: string) => void;
  onAddCheque: (cheque: Omit<Cheque, 'id'>) => void;
  contacts?: Entity[];
  activeTabProp?: 'list' | 'achat' | 'charges' | 'apports' | 'report';
  isReadOnly?: boolean;
  products?: Product[];
  onCreateStockEntry?: (entry: Omit<StockEntry, 'id' | 'entryNumber'>) => void;
  apports?: Apport[];
  onDeleteApport?: (id: string) => void;
}

const Payments: React.FC<PaymentsProps> = ({ 
  payments, onUpdatePayment, onDeletePayment, charges, onUpdateCharge, onAddCharge, onDeleteCharge, onAddCheque, contacts = [], activeTabProp, isReadOnly = false, products = [], onCreateStockEntry, apports = [], onDeleteApport
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'achat' | 'charges' | 'apports'>(activeTabProp === 'report' ? 'list' : (activeTabProp === 'apports' ? 'apports' : (activeTabProp || 'list')));
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedChargeToPay, setSelectedChargeToPay] = useState<Charge | null>(null);
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'payment' | 'charge' | 'apport'} | null>(null);
  const [viewHistoryItem, setViewHistoryItem] = useState<Payment | Charge | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Payment | null>(null);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);
  
  // FILTERS
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // FORM STATES
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.VIREMENT);
  const [paymentDate, setPaymentDate] = useState('');
  const [newChargeData, setNewChargeData] = useState({ 
    description: '', 
    category: 'Divers', 
    amount: 0, 
    date: '', 
    responsible: '',
    method: PaymentMethod.ESPECES
  });

  // NEW PURCHASE (ACHAT) MODAL STATE
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<StockEntryItem[]>([]);
  const [purchaseItemName, setPurchaseItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [costPriceTTC, setCostPriceTTC] = useState(0);
  
  // CHEQUE FIELDS
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');

  useEffect(() => { 
    const today = new Date().toISOString().split('T')[0];
    setPaymentDate(today); 
    setNewChargeData(prev => ({ ...prev, date: today }));
    setPurchaseDate(today);
  }, []);

  const responsibles = useMemo(() => {
    const list = charges.map(c => c.responsible).filter((r): r is string => !!r && r !== '---');
    return Array.from(new Set(list)).sort();
  }, [charges]);

  const suppliers = useMemo(() => contacts.filter(c => c.type === 'supplier'), [contacts]);

  const filteredData = useMemo(() => {
    let source: any[] = [];
    if (activeTab === 'list') source = payments;
    else if (activeTab === 'apports') source = apports;
    else source = charges.filter(c => {
        return activeTab === 'achat' ? c.category === 'Marchandises' : c.category !== 'Marchandises';
    });

    return source.filter(item => {
      const label = 'invoiceNumber' in item ? item.invoiceNumber : (item.reference || item.description);
      const partner = 'customerName' in item ? item.customerName : (item.supplierName || item.category || 'Associé');
      const resp = 'responsible' in item ? item.responsible : '';
      
      const matchSearch = label.toLowerCase().includes(searchTerm.toLowerCase()) || partner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || (item.status ? item.status === statusFilter : true);
      const matchResp = responsibleFilter === 'ALL' || resp === responsibleFilter;
      const matchStart = !dateStart || item.date >= dateStart;
      const matchEnd = !dateEnd || item.date <= dateEnd;

      return matchSearch && matchStatus && matchStart && matchEnd && (activeTab !== 'charges' || matchResp);
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activeTab, payments, charges, apports, searchTerm, statusFilter, responsibleFilter, dateStart, dateEnd]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => { 
        const amount = Number(item.amount) || 0;
        const hasStatus = 'status' in item;
        const paid = hasStatus ? (Number(item.paidAmount) || 0) : amount; 
        const reste = hasStatus ? Math.max(0, Number((amount - paid).toFixed(2))) : 0;
        
        acc.totalAmount += amount; 
        acc.totalPaid += paid; 
        acc.totalRemaining += reste; 
        return acc; 
    }, { totalAmount: 0, totalPaid: 0, totalRemaining: 0 });
  }, [filteredData]);

  // Rounding totals for consistent display
  const roundedTotals = {
    totalAmount: Number(totals.totalAmount.toFixed(2)),
    totalPaid: Number(totals.totalPaid.toFixed(2)),
    totalRemaining: Number(totals.totalRemaining.toFixed(2))
  };

  const totalPurchaseTTC = useMemo(() => {
    return purchaseItems.reduce((acc, item) => acc + (item.costPrice * 1.20 * item.quantity), 0);
  }, [purchaseItems]);

  const handleOpenPaymentModal = (item: Payment | Charge) => {
    if (isReadOnly) return;
    if ('invoiceNumber' in item) setSelectedPayment(item as Payment);
    else setSelectedChargeToPay(item as Charge);
    setNewPaymentAmount(Number(((Number(item.amount) || 0) - (Number(item.paidAmount) || 0)).toFixed(2)));
    setPaymentMethod(PaymentMethod.VIREMENT);
    setChequeNumber(''); setChequeBank('');
  };

  const handleSavePaymentUpdates = () => {
    if (isReadOnly) return;
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedPayment) {
        const totalPaidNow = Number(((Number(selectedPayment.paidAmount) || 0) + newPaymentAmount).toFixed(2));
        const status = (selectedPayment.amount - totalPaidNow) < 0.01 ? PaymentStatus.PAID : (totalPaidNow <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL);
        
        onUpdatePayment(selectedPayment.id, { 
          paidAmount: totalPaidNow, status, 
          history: [...(selectedPayment.history || []), { date: paymentDate, amount: newPaymentAmount, method: paymentMethod }] 
        });
        if (paymentMethod === PaymentMethod.CHEQUE) {
          onAddCheque({ number: chequeNumber || 'N/A', bank: chequeBank || 'N/A', amount: newPaymentAmount, dueDate: paymentDate, receivedDate: today, status: ChequeStatus.RECEIVED, reference: selectedPayment.invoiceNumber, partnerName: selectedPayment.customerName, type: 'IN' });
        }
        setSelectedPayment(null);
    } else if (selectedChargeToPay) {
        const totalPaidNow = Number(((Number(selectedChargeToPay.paidAmount) || 0) + newPaymentAmount).toFixed(2));
        const status = (selectedChargeToPay.amount - totalPaidNow) < 0.01 ? PaymentStatus.PAID : (totalPaidNow <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL);
        
        onUpdateCharge(selectedChargeToPay.id, { 
          paidAmount: totalPaidNow, status, 
          history: [...(selectedChargeToPay.history || []), { date: paymentDate, amount: newPaymentAmount, method: paymentMethod }] 
        });
        if (paymentMethod === PaymentMethod.CHEQUE) {
          onAddCheque({ number: chequeNumber || 'N/A', bank: chequeBank || 'N/A', amount: newPaymentAmount, dueDate: paymentDate, receivedDate: today, status: ChequeStatus.RECEIVED, reference: selectedChargeToPay.reference || selectedChargeToPay.description, partnerName: selectedChargeToPay.supplierName || 'Divers', type: 'OUT' });
        }
        setSelectedChargeToPay(null);
    }
  };

  const handleCreateCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    onAddCharge({
      description: newChargeData.description,
      category: newChargeData.category,
      amount: newChargeData.amount,
      date: newChargeData.date,
      responsible: newChargeData.responsible,
      method: newChargeData.method
    });
    setShowAddChargeModal(false);
    setNewChargeData({ 
      description: '', 
      category: 'Divers', 
      amount: 0, 
      date: new Date().toISOString().split('T')[0], 
      responsible: '',
      method: PaymentMethod.ESPECES
    });
  };

  const addPurchaseItem = () => {
    if (!purchaseItemName.trim() || quantity <= 0 || costPriceTTC <= 0 || isReadOnly) return;
    const existingProduct = products?.find(p => p.name.toLowerCase() === purchaseItemName.toLowerCase());
    setPurchaseItems([...purchaseItems, { 
      productId: existingProduct?.id || `svc-${Date.now()}`, 
      productName: existingProduct?.name || purchaseItemName, 
      sku: existingProduct?.sku || 'SERVICE', 
      quantity, 
      costPrice: costPriceTTC / 1.20 
    }]);
    setPurchaseItemName(''); setQuantity(1); setCostPriceTTC(0);
  };

  const handleFinalPurchaseSubmit = () => {
    if (isReadOnly || !onCreateStockEntry) return;
    if (!purchaseSupplierId) { alert("Sélectionnez un fournisseur."); return; }
    if (purchaseItems.length === 0) { alert("Le panier est vide."); return; }
    const supplier = suppliers.find(s => s.id === purchaseSupplierId);
    if (!supplier) return;
    onCreateStockEntry({
      items: purchaseItems,
      purchaseOrderNumber: 'FINANCE-ACHAT',
      totalHT: totalPurchaseTTC / 1.20,
      totalTTC: totalPurchaseTTC,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: purchaseDate,
      attachmentUrl: null
    });
    setPurchaseItems([]);
    setPurchaseSupplierId('');
    setShowAddPurchaseModal(false);
  };

  const handleUpdateEditItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...editItems];
    const item = { ...updated[idx], [field]: value };
    if (field === 'quantity' || field === 'unitPriceHT') {
      item.totalHT = item.quantity * item.unitPriceHT;
    }
    updated[idx] = item;
    setEditItems(updated);
  };

  const saveEditedInvoice = () => {
    if (!editingInvoice) return;
    const newTotalTTC = editItems.reduce((acc, i) => acc + i.totalHT, 0) * 1.20;
    const status = (newTotalTTC - editingInvoice.paidAmount) < 0.01 ? PaymentStatus.PAID : (editingInvoice.paidAmount <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL);
    onUpdatePayment(editingInvoice.id, { items: editItems, amount: newTotalTTC, status });
    setEditingInvoice(null);
  };

  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    const parts = Math.abs(val).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${val < 0 ? '-' : ''}${parts[0]},${parts[1]}`;
  };

  const generateInvoicePDF = (payment: Payment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const client = (contacts || []).find(c => c.name === payment.customerName);
    
    doc.setFillColor(59, 130, 246); doc.roundedRect(14, 15, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("TP", 16, 23);
    doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text("TRADING PARTNERSHIPS S.A.R.L", 30, 23);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
    doc.text("ICE : 003338833000011 - RC : 591271 - IF : 53894480", 30, 28);
    
    doc.setFontSize(14); doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "bold"); 
    doc.text("FACTURE", 196, 23, { align: 'right' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
    doc.text(`N°: ${payment.invoiceNumber}`, 196, 30, { align: 'right' }); 
    doc.text(`Date: ${payment.date}`, 196, 35, { align: 'right' });
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 45, 196, 45);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("CLIENT :", 14, 55);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.text(payment.customerName.toUpperCase(), 14, 61);
    if (client) {
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
      if (client.ice) doc.text(`ICE: ${client.ice}`, 14, 67);
      if (client.ifId) doc.text(`IF: ${client.ifId}`, 14, 72);
    }
    autoTable(doc, {
      startY: 85,
      head: [['Produit', 'Qté', 'P.U. HT', 'Total HT']],
      body: (payment.items || []).map(i => [i.productName, i.quantity.toString(), formatAmount(i.unitPriceHT), formatAmount(i.totalHT)]),
      theme: 'grid', headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 3 }
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const totalHT = payment.items?.reduce((acc, i) => acc + i.totalHT, 0) || (payment.amount / 1.2);
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text("TOTAL HT :", 80, finalY); doc.text(`${formatAmount(totalHT)} DH`, 190, finalY, { align: 'right' });
    doc.text("TVA (20%) :", 80, finalY + 7); doc.text(`${formatAmount(totalHT * 0.2)} DH`, 190, finalY + 7, { align: 'right' });
    doc.setFontSize(12); doc.setTextColor(59, 130, 246);
    doc.text("TOTAL TTC :", 80, finalY + 15); doc.text(`${formatAmount(payment.amount)} DH`, 190, finalY + 15, { align: 'right' });
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
    doc.save(`Facture_${payment.invoiceNumber}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20 w-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Finance & Trésorerie</h2><p className="text-slate-500 font-medium text-sm">Gestion des flux financiers basés sur les règlements réels.</p></div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {activeTab === 'charges' && !isReadOnly && (<button onClick={() => setShowAddChargeModal(true)} className="flex-1 md:flex-none px-6 py-3 bg-[#E11D48] text-white rounded-full text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-rose-700 transition-all active:scale-95"><Plus className="w-4 h-4" /> Nouvelle Charge</button>)}
          {activeTab === 'achat' && !isReadOnly && (<button onClick={() => setShowAddPurchaseModal(true)} className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95"><ShoppingCart className="w-4 h-4" /> Nouvel Achat</button>)}
          
          <button onClick={() => exportToCsv(`finance_${activeTab}.csv`, filteredData)} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" />EXPORTER CSV</button>
          
          <div className="flex bg-white p-1 rounded-full border border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {(['list', 'achat', 'charges', 'apports'] as const).map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-blue-50 text-[#E11D48] shadow-inner' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'list' ? 'Factures' : tab === 'achat' ? 'Achats' : tab === 'apports' ? 'Apports' : 'Charges'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Recherche</label><div className="relative group"><Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Tiers, Référence..." className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
        <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label><select className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none text-[10px] font-black uppercase text-slate-700" value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)}><option value="ALL">Tous</option>{responsibles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Statuts</label><select className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none text-[10px] font-black uppercase text-slate-700" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">Tous</option><option value={PaymentStatus.PAID}>Payé</option><option value={PaymentStatus.PARTIAL}>Partiel</option><option value={PaymentStatus.UNPAID}>Non Payé</option></select></div>
        <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Du</label><input type="date" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none text-xs font-bold" value={dateStart} onChange={(e) => setDateStart(e.target.value)} /></div>
        <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Au</label><input type="date" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none text-xs font-bold" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} /></div>
        <div className="md:col-span-1"><button onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setResponsibleFilter('ALL'); setDateStart(''); setDateEnd(''); }} className="w-full md:w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-colors"><RotateCcw className="w-5 h-5" /></button></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm relative overflow-hidden"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Montant</p><p className="text-3xl md:text-4xl font-black text-slate-900 mt-4 tabular-nums">{formatAmount(roundedTotals.totalAmount)} <span className="text-xl">DH</span></p></div>
        <div className="bg-[#ECFDF5] p-8 rounded-[2.5rem] border border-[#D1FAE5] shadow-sm relative overflow-hidden"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Total Réglé</p><p className="text-3xl md:text-4xl font-black text-[#059669] mt-4 tabular-nums">{formatAmount(roundedTotals.totalPaid)} <span className="text-xl">DH</span></p></div>
        <div className="bg-[#FFF1F2] p-8 rounded-[2.5rem] border border-[#FFE4E6] shadow-sm relative overflow-hidden"><p className="text-[9px] font-black text-[#E11D48] uppercase tracking-[0.2em]">Total Reste</p><p className="text-3xl md:text-4xl font-black text-[#E11D48] mt-4 tabular-nums">{formatAmount(roundedTotals.totalRemaining)} <span className="text-xl">DH</span></p></div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-10 py-6">Référence / Libellé</th><th className="px-6 py-6">Date</th><th className="px-6 py-6">Tiers</th><th className="px-6 py-6">Responsable</th><th className="px-6 py-6 text-center">Statut</th><th className="px-6 py-6 text-right">Montant</th><th className="px-6 py-6 text-right">Reste</th><th className="px-10 py-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item: any) => {
                const amount = Number(item.amount) || 0;
                const hasStatus = 'status' in item;
                const paid = hasStatus ? (Number(item.paidAmount) || 0) : amount; 
                const rawReste = amount - paid;
                const reste = Math.max(0, Number(rawReste.toFixed(2)));
                
                let displayStatus = hasStatus ? item.status : PaymentStatus.PAID;
                if (hasStatus) {
                    if (reste < 0.01) displayStatus = PaymentStatus.PAID;
                    else if (paid > 0) displayStatus = PaymentStatus.PARTIAL;
                    else displayStatus = PaymentStatus.UNPAID;
                }
                
                const reference = activeTab === 'list' ? item.invoiceNumber : (activeTab === 'apports' ? item.reference : (item.reference || item.description));
                const partner = activeTab === 'list' ? item.customerName : (activeTab === 'apports' ? 'Associé' : (item.supplierName || item.category));
                const resp = 'responsible' in item ? item.responsible : '---';
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-all duration-300 group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        {activeTab === 'apports' && <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><Plus className="w-4 h-4" /></div>}
                        <p className="font-black text-slate-900 text-sm md:text-base tracking-tight max-w-[250px] uppercase">{reference}</p>
                      </div>
                    </td>
                    <td className="px-6 py-6"><p className="text-xs font-bold text-slate-400 whitespace-nowrap">{item.date}</p></td>
                    <td className="px-6 py-6"><span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200/50">{partner}</span></td>
                    <td className="px-6 py-6"><p className="text-xs font-black text-slate-700 uppercase">{resp || '---'}</p></td>
                    <td className="px-6 py-6 text-center"><span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${displayStatus === PaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600' : displayStatus === PaymentStatus.PARTIAL ? 'bg-amber-50 text-amber-600' : 'bg-[#E0E7FF]/50 text-[#4F46E5]'}`}>{displayStatus === PaymentStatus.UNPAID ? 'NON PAYÉ' : displayStatus}</span></td>
                    <td className="px-6 py-6 text-right whitespace-nowrap"><p className="text-base font-black text-slate-900 tabular-nums">{formatAmount(item.amount)} <span className="text-[10px] opacity-50 ml-1">DH</span></p></td>
                    <td className="px-6 py-6 text-right whitespace-nowrap"><p className={`text-base font-black tabular-nums ${reste >= 0.01 ? 'text-[#E11D48]' : 'text-slate-900'}`}>{formatAmount(reste)} <span className="text-[10px] opacity-50 ml-1">DH</span></p></td>
                    <td className="px-10 py-6 text-right">
                        <div className="flex justify-end items-center gap-3">
                            {activeTab === 'list' && !isReadOnly && (<button onClick={() => { setEditingInvoice(item); setEditItems(item.items || []); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl" title="Éditer Articles"><Edit3 className="w-5 h-5" /></button>)}
                            {item.history && <button onClick={() => setViewHistoryItem(item)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Historique"><Clock className="w-5 h-5" /></button>}
                            {activeTab === 'list' && (<button onClick={() => generateInvoicePDF(item)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors" title="PDF"><FileText className="w-5 h-5" /></button>)}
                            {!isReadOnly && displayStatus !== PaymentStatus.PAID && activeTab !== 'apports' && (<button onClick={() => handleOpenPaymentModal(item)} className="bg-[#059669] hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 whitespace-nowrap">Régler</button>)}
                            {!isReadOnly && (<button onClick={() => setItemToDelete({id: item.id, type: activeTab === 'list' ? 'payment' : (activeTab === 'apports' ? 'apport' : 'charge')})} className="p-2 text-slate-200 hover:text-rose-600 md:opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>)}
                        </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan={8} className="px-10 py-20 text-center text-slate-400 font-medium italic">Aucun élément trouvé dans cette catégorie.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS OMITTED FOR BREVITY AS CONTENT IS FINAL AND COMPLETE */}
      {showAddChargeModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <form onSubmit={handleCreateCharge} className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-lg shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nouvelle Charge</h3>
                <p className="text-rose-600 font-bold text-xs uppercase mt-1">Enregistrement d'une dépense</p>
              </div>
              <button type="button" onClick={() => setShowAddChargeModal(false)} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Libellé / Description</label>
                <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newChargeData.description} onChange={(e) => setNewChargeData({...newChargeData, description: e.target.value})} placeholder="ex: Loyer Mars, Salaire..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Catégorie</label>
                  <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newChargeData.category} onChange={(e) => setNewChargeData({...newChargeData, category: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsable</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newChargeData.responsible} onChange={(e) => setNewChargeData({...newChargeData, responsible: e.target.value})} placeholder="Nom..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Montant TTC (DH)</label>
                  <input type="number" step="0.01" required className="w-full px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-black text-blue-600 text-lg" value={newChargeData.amount || ''} onChange={(e) => setNewChargeData({...newChargeData, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date</label>
                  <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={newChargeData.date} onChange={(e) => setNewChargeData({...newChargeData, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode de règlement par défaut</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setNewChargeData({...newChargeData, method: PaymentMethod.ESPECES})} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${newChargeData.method === PaymentMethod.ESPECES ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><Banknote className="w-5 h-5" /><span className="text-[8px] font-black">ESPÈCES</span></button>
                  <button type="button" onClick={() => setNewChargeData({...newChargeData, method: PaymentMethod.VIREMENT})} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${newChargeData.method === PaymentMethod.VIREMENT ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><CreditCard className="w-5 h-5" /><span className="text-[8px] font-black">VIREMENT</span></button>
                  <button type="button" onClick={() => setNewChargeData({...newChargeData, method: PaymentMethod.CHEQUE})} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${newChargeData.method === PaymentMethod.CHEQUE ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><ClipboardList className="w-5 h-5" /><span className="text-[8px] font-black">CHÈQUE</span></button>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-slate-100">
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Créer la charge</button>
            </div>
          </form>
        </div>
      )}

      {showAddPurchaseModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-4xl shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nouvel Achat (Entrée Stock)</h3>
                <p className="text-blue-600 font-bold text-xs uppercase mt-1">Génère un AR et met à jour l'encours fournisseur</p>
              </div>
              <button type="button" onClick={() => setShowAddPurchaseModal(false)} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fournisseur</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={purchaseSupplierId} onChange={(e) => setPurchaseSupplierId(e.target.value)}>
                  <option value="">Sélectionner Fournisseur...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date d'achat</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
            </div>
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-8">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Service / Désignation</label>
                <input type="text" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl outline-none font-bold text-slate-700" placeholder="Saisissez le service ou produit..." value={purchaseItemName} onChange={(e) => setPurchaseItemName(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Qté</label>
                <input type="number" min="1" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-black text-center" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">P.U. TTC</label>
                <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl font-black text-center" value={costPriceTTC || ''} onChange={(e) => setCostPriceTTC(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <button onClick={addPurchaseItem} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-100 transition-all active:scale-95">Ajouter</button>
              </div>
            </div>
            {purchaseItems.length > 0 && (
              <div className="space-y-6">
                <div className="overflow-x-auto bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr><th className="px-6 py-4">Service</th><th className="px-4 py-4 text-center">Qté</th><th className="px-4 py-4 text-right">P.U. TTC</th><th className="px-6 py-4 text-right">Total TTC</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-6 py-4 font-bold text-slate-800">{item.productName}</td>
                          <td className="px-4 py-4 text-center font-black">{item.quantity}</td>
                          <td className="px-4 py-4 text-right font-bold">{(item.costPrice * 1.2).toLocaleString()} DH</td>
                          <td className="px-6 py-4 text-right font-black text-blue-600">{(item.costPrice * 1.2 * item.quantity).toLocaleString()} DH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-8 bg-slate-900 text-white rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total TTC de l'Achat</p>
                    <h4 className="text-4xl font-black">{formatAmount(totalPurchaseTTC)} <span className="text-xl opacity-50">DH</span></h4>
                  </div>
                  <button onClick={handleFinalPurchaseSubmit} className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all">Valider et Stocker l'Achat</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-4xl shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8"><div><h3 className="text-2xl font-black">Édition des articles : {editingInvoice.invoiceNumber}</h3></div><button onClick={() => setEditingInvoice(null)} className="text-slate-300 hover:text-slate-900"><X className="w-8 h-8" /></button></div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase"><tr><th className="px-4 py-3">Désignation</th><th className="px-4 py-3 text-center">Qté</th><th className="px-4 py-3 text-right">P.U. HT</th><th className="px-4 py-3 text-right">Total HT</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {editItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3"><input type="text" className="w-full bg-slate-50 border p-2 rounded-xl font-bold" value={item.productName} onChange={(e) => handleUpdateEditItem(idx, 'productName', e.target.value)} /></td>
                      <td className="px-4 py-3 text-center"><input type="number" className="w-20 text-center bg-slate-50 border p-2 rounded-xl font-bold" value={item.quantity} onChange={(e) => handleUpdateEditItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></td>
                      <td className="px-4 py-3 text-right"><input type="number" className="w-32 text-right bg-slate-50 border p-2 rounded-xl font-bold" value={item.unitPriceHT} onChange={(e) => handleUpdateEditItem(idx, 'unitPriceHT', parseFloat(e.target.value) || 0)} /></td>
                      <td className="px-4 py-3 text-right font-black">{formatAmount(item.totalHT)} DH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-6">
              <div><p className="text-[10px] font-black text-slate-400 uppercase">Nouveau Total TTC (TVA 20%)</p><p className="text-3xl font-black text-blue-600">{formatAmount(editItems.reduce((acc, i) => acc + i.totalHT, 0) * 1.20)} DH</p></div>
              <button onClick={saveEditedInvoice} className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs">Enregistrer les modifications</button>
            </div>
          </div>
        </div>
      )}

      {(selectedPayment || selectedChargeToPay) && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-6 md:p-10 w-full max-w-xl shadow-2xl animate-fadeIn border border-white/20 max-h-[95vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8"><div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Enregistrer un Règlement</h3><p className="text-blue-600 font-bold text-xs uppercase mt-1">{selectedPayment ? selectedPayment.invoiceNumber : (selectedChargeToPay?.reference || selectedChargeToPay?.description)}</p></div><button onClick={() => { setSelectedPayment(null); setSelectedChargeToPay(null); }} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (DH)</label><input type="number" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-black text-3xl text-center text-blue-600" value={newPaymentAmount || ''} onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)} /><p className="text-[9px] text-center text-slate-400 font-bold mt-2">Reste : {formatAmount((selectedPayment?.amount || selectedChargeToPay?.amount || 0) - (selectedPayment?.paidAmount || selectedChargeToPay?.paidAmount || 0))} DH</p></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode</label><div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setPaymentMethod(PaymentMethod.ESPECES)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-1.5 ${paymentMethod === PaymentMethod.ESPECES ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><Banknote className="w-5 h-5" /><span className="text-[8px] font-black">ESPÈCES</span></button>
                  <button type="button" onClick={() => setPaymentMethod(PaymentMethod.VIREMENT)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-2 ${paymentMethod === PaymentMethod.VIREMENT ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><CreditCard className="w-5 h-5" /><span className="text-[8px] font-black">VIREMENT</span></button>
                  <button type="button" onClick={() => setPaymentMethod(PaymentMethod.CHEQUE)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 gap-2 ${paymentMethod === PaymentMethod.CHEQUE ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400'}`}><ClipboardList className="w-5 h-5" /><span className="text-[8px] font-black">CHÈQUE</span></button>
                </div></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
                {paymentMethod === PaymentMethod.CHEQUE && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn"><div className="space-y-2"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">N° Chèque</label><input type="text" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} /></div><div className="space-y-2"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Banque</label><input type="text" className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} /></div></div>)}
              </div>
              <div className="flex flex-col h-full"><div className="bg-slate-50/50 rounded-3xl p-6 flex-1 border border-slate-100"><h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><HistoryIcon className="w-3 h-3" /> Historique</h4><div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">{(selectedPayment?.history || selectedChargeToPay?.history || []).map((h, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-white rounded-2xl border shadow-sm"><div><p className="text-[9px] font-black text-slate-400 uppercase">{h.date}</p><p className="text-[10px] font-bold">{h.method}</p></div><p className={`font-black text-sm ${h.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{h.amount < 0 ? '' : '+'}{h.amount.toLocaleString()} DH</p></div>))}</div></div><div className="pt-6 mt-auto space-y-3"><button onClick={handleSavePaymentUpdates} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Valider le règlement</button></div></div>
            </div>
          </div>
        </div>
      )}

      {viewHistoryItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-md shadow-2xl animate-fadeIn border border-white/20">
            <div className="flex justify-between items-center mb-8"><div><h3 className="text-xl font-black text-slate-900">Historique de Règlement</h3><p className="text-indigo-600 font-bold text-xs uppercase mt-1">{'invoiceNumber' in viewHistoryItem ? viewHistoryItem.invoiceNumber : (viewHistoryItem.reference || viewHistoryItem.description)}</p></div><button onClick={() => setViewHistoryItem(null)} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button></div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">{(viewHistoryItem.history || []).map((h, idx) => (<div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border"><div><p className="text-[10px] font-black text-slate-400 uppercase">{h.date}</p><p className="text-sm font-bold">{h.method}</p></div><p className={`font-black text-base ${h.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{h.amount < 0 ? '' : '+'}{formatAmount(h.amount)} DH</p></div>))}</div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-400 uppercase">Total Réglé</p><p className="text-2xl font-black text-emerald-600">{formatAmount(viewHistoryItem.paidAmount)} DH</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase">Reste</p><p className="text-2xl font-black text-rose-600">{formatAmount(viewHistoryItem.amount - viewHistoryItem.paidAmount)} DH</p></div></div>
          </div>
        </div>
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 md:p-10 border-none shadow-2xl max-w-[90vw] md:max-w-lg">
          <AlertDialogHeader><div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 text-3xl">🗑️</div><AlertDialogTitle className="text-3xl font-black text-slate-900">Supprimer cet élément ?</AlertDialogTitle><AlertDialogDescription className="text-slate-500 font-medium text-lg leading-relaxed mt-2">Cette action est définitive. Les données financières liées à cette référence seront supprimées.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-4 flex flex-col md:flex-row"><AlertDialogCancel className="rounded-2xl font-bold px-8 border-slate-200 text-slate-500 uppercase text-[10px]">Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { if (itemToDelete) { if (itemToDelete.type === 'payment') onDeletePayment(itemToDelete.id); else if (itemToDelete.type === 'apport') onDeleteApport?.(itemToDelete.id); else onDeleteCharge(itemToDelete.id); setItemToDelete(null); } }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black px-8 uppercase text-[10px]">Confirmer Suppression</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;