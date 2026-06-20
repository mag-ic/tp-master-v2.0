'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Delivery, PaymentMethod, Entity, Payment, DeliveryItem, Charge, PaymentStatus, StockType } from '@/lib/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Trash2, Eye, FileText, X, Lock, History, RotateCcw, Edit3, RefreshCcw, Package, AlertTriangle, FilePlus } from 'lucide-react';
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

interface DeliveriesProps {
  products: Product[];
  clients: Entity[];
  deliveries: Delivery[];
  onCreateDelivery: (delivery: Omit<Delivery, 'id' | 'deliveryNumber'>, commission?: number) => void;
  onUpdateDelivery?: (id: string, delivery: Partial<Delivery>) => void;
  onReturnItem?: (deliveryId: string, itemIdx: number, returnQty: number) => void;
  onGenerateInvoice?: (delivery: Delivery) => void;
  onDeleteDelivery?: (deliveryId: string, deliveryNumber: string) => void;
  existingPayments?: Payment[];
  highlightedDeliveryId?: string | null;
  onClearHighlight?: () => void;
  charges?: Charge[];
  isReadOnly?: boolean;
}

const Deliveries: React.FC<DeliveriesProps> = ({ 
  products, clients, deliveries, onCreateDelivery, onUpdateDelivery, onReturnItem, onGenerateInvoice, onDeleteDelivery, existingPayments = [], highlightedDeliveryId, onClearHighlight, charges = [], isReadOnly = false
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStockType, setSelectedStockType] = useState<StockType>('NEUF');
  const [quantity, setQuantity] = useState(1);
  const [unitPriceTTC, setUnitPriceTTC] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.ESPECES);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [cartItems, setCartItems] = useState<DeliveryItem[]>([]);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [detailDelivery, setDetailDelivery] = useState<Delivery | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<{id: string, number: string} | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  
  // États pour le retour marchandise
  const [returningItem, setReturningItem] = useState<{ dlvId: string, itemIdx: number, maxQty: number } | null>(null);
  const [returnQty, setReturnQty] = useState(1);

  // Filters
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => { 
    setDeliveryDate(new Date().toISOString().split('T')[0]); 
  }, []);

  useEffect(() => {
    if (highlightedDeliveryId) {
      const delivery = deliveries.find(d => d.id === highlightedDeliveryId);
      if (delivery) setDetailDelivery(delivery);
      onClearHighlight?.();
    }
  }, [highlightedDeliveryId, deliveries, onClearHighlight]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchStart = !dateStart || d.date >= dateStart;
      const matchEnd = !dateEnd || d.date <= dateEnd;
      return matchStart && matchEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveries, dateStart, dateEnd]);

  const totalHT = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalTTC = totalHT * 1.20;

  const addItemToCart = () => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct || quantity <= 0 || unitPriceTTC <= 0 || isReadOnly) return;
    
    // Vérification stock
    const available = selectedStockType === 'NEUF' ? selectedProduct.stock : selectedProduct.declassedStock;
    if (quantity > available) {
      alert(`Stock insuffisant. Disponible (${selectedStockType}) : ${available}`);
      return;
    }

    const unitPriceHT = unitPriceTTC / 1.20;
    setCartItems([...cartItems, { 
      productId: selectedProduct.id, 
      productName: selectedProduct.name, 
      sku: selectedProduct.sku, 
      quantity, 
      unitPrice: unitPriceHT, 
      totalPrice: unitPriceHT * quantity,
      stockType: selectedStockType
    }]);
    setSelectedProductId(''); setQuantity(1); setUnitPriceTTC(0);
  };

  const removeItemFromCart = (idx: number) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  const handleFinalSubmit = () => {
    if (isReadOnly) return;
    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (!selectedClient) { alert("Veuillez sélectionner un client."); return; }

    if (editingDelivery) {
      onUpdateDelivery?.(editingDelivery.id, {
        items: cartItems,
        totalHT,
        totalTTC,
        paymentMethod: method,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        date: deliveryDate
      });
      setEditingDelivery(null);
    } else {
      onCreateDelivery({ 
        items: cartItems, 
        totalHT, 
        totalTTC, 
        paymentMethod: method, 
        clientId: selectedClient.id, 
        clientName: selectedClient.name, 
        date: deliveryDate 
      }, commissionAmount);
    }
    setCartItems([]); setSelectedClientId(''); setCommissionAmount(0); setShowCommissionModal(false);
  };

  const isAlreadyInvoiced = (delivery: Delivery) => {
    const expectedInvoiceNumber = delivery.deliveryNumber.replace('BL-', 'INV-');
    return existingPayments.some(p => p.invoiceNumber === expectedInvoiceNumber);
  };

  const startEdit = (delivery: Delivery) => {
    if (isAlreadyInvoiced(delivery)) {
      alert("Modification impossible : une facture a déjà été générée pour ce bon de livraison.");
      return;
    }
    setEditingDelivery(delivery);
    setCartItems(delivery.items);
    setSelectedClientId(delivery.clientId);
    setDeliveryDate(delivery.date);
    setMethod(delivery.paymentMethod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    const parts = Math.abs(val).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${val < 0 ? '-' : ''}${parts[0]},${parts[1]}`;
  };

  const generatePDF = (delivery: Delivery) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const client = clients.find(c => c.id === delivery.clientId);

    doc.setFillColor(59, 130, 246);
    doc.roundedRect(14, 15, 12, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.text("TP", 16, 23);
    doc.setFontSize(16); doc.setTextColor(30, 41, 59); doc.text("TRADING PARTNERSHIPS S.A.R.L", 30, 23);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
    doc.text("ICE : 003338833000011 - RC : 591271 - IF : 53894480", 30, 28);
    
    doc.setFontSize(14); doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "bold"); 
    doc.text("BON DE LIVRAISON", 196, 23, { align: 'right' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
    doc.text(`N°: ${delivery.deliveryNumber}`, 196, 30, { align: 'right' }); 
    doc.text(`Date: ${delivery.date}`, 196, 35, { align: 'right' });
    
    doc.setDrawColor(226, 232, 240); doc.line(14, 45, 196, 45);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("LIVRÉ À :", 14, 55);
    doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold"); doc.text(delivery.clientName.toUpperCase(), 14, 61);
    if (client) {
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
      if (client.ice) doc.text(`ICE: ${client.ice}`, 14, 67);
      if (client.ifId) doc.text(`IF: ${client.ifId}`, 14, 72);
    }

    autoTable(doc, {
      startY: 85,
      head: [['Produit', 'Type', 'Qté', 'P.U. HT', 'Total HT']],
      body: delivery.items.map(i => [i.productName, i.stockType, i.quantity.toString(), formatAmount(i.unitPrice), formatAmount(i.totalPrice)]),
      theme: 'grid', headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text("TOTAL HT :", 80, finalY); doc.text(`${formatAmount(delivery.totalHT)} DH`, 190, finalY, { align: 'right' });
    doc.text("TVA (20%) :", 80, finalY + 7); doc.text(`${formatAmount(delivery.totalTTC - delivery.totalHT)} DH`, 190, finalY + 7, { align: 'right' });
    doc.setFontSize(12); doc.setTextColor(59, 130, 246);
    doc.text("TOTAL TTC :", 80, finalY + 15); doc.text(`${formatAmount(delivery.totalTTC)} DH`, 190, finalY + 15, { align: 'right' });

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

    doc.save(`BL_${delivery.deliveryNumber}.pdf`);
  };

  const getProductStock = (productId: string, type: StockType) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return 0;
    return type === 'NEUF' ? p.stock : p.declassedStock;
  };

  return (
    <div className="space-y-8 animate-fadeIn w-full pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Ventes & Livraisons</h2><p className="text-sm text-slate-500 mt-1 font-medium">Gérez vos sorties de stock (Neuf & Déclassé) et BL.</p></div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportToCsv('livraisons.csv', deliveries)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"><Download className="w-4 h-4" /> EXPORTER CSV</button>
          {isReadOnly && <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-400 font-bold text-[10px] border border-slate-200 uppercase tracking-widest"><Lock className="w-3 h-3" /> Consultation</div>}
        </div>
      </header>

      {!isReadOnly && (
        <div className={`bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border space-y-8 ${editingDelivery ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-50'}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">{editingDelivery ? `Modification du BL ${editingDelivery.deliveryNumber}` : 'Nouvelle Vente'}</h3>
            {editingDelivery && <button onClick={() => { setEditingDelivery(null); setCartItems([]); setSelectedClientId(''); }} className="text-slate-400"><X className="w-6 h-6" /></button>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CLIENT</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}><option value="">Sélectionner Client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE DOCUMENT</label><input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RÈGLEMENT</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}><option value={PaymentMethod.ESPECES}>Espèces</option><option value={PaymentMethod.CHEQUE}>Chèque</option><option value={PaymentMethod.VIREMENT}>Virement</option></select></div>
          </div>

          <div className="p-6 bg-blue-50/20 rounded-[2.5rem] border border-blue-100/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">PRODUIT</label><select className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl outline-none font-bold text-slate-700" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}><option value="">Choisir...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (N:{p.stock} | D:{p.declassedStock})</option>)}</select></div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">STOCK</label>
                <select className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl outline-none font-black text-slate-700" value={selectedStockType} onChange={(e) => setSelectedStockType(e.target.value as StockType)}>
                  <option value="NEUF">Neuf</option>
                  <option value="DECLASSE">Déclassé</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">QTÉ</label>
                <input type="number" min="1" className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl font-black text-slate-700 text-center" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                {selectedProductId && <p className="text-[8px] text-center font-bold text-blue-400">Dispo: {getProductStock(selectedProductId, selectedStockType)}</p>}
              </div>
              <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">PRIX VENTE TTC</label><input type="number" step="0.01" className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl font-black text-slate-700 text-center" value={unitPriceTTC || ''} onChange={(e) => setUnitPriceTTC(parseFloat(e.target.value) || 0)} /></div>
              <div className="md:col-span-2"><button onClick={addItemToCart} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">AJOUTER</button></div>
            </div>

            {cartItems.length > 0 && (
              <div className="mt-4 overflow-hidden border border-blue-100 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-blue-50/50 text-[9px] font-black text-blue-600 uppercase">
                    <tr><th className="px-4 py-3">Article</th><th className="px-4 py-3 text-center">Type</th><th className="px-4 py-3 text-center">Qté</th><th className="px-4 py-3 text-right">P.U. HT</th><th className="px-4 py-3 text-right">Total HT</th><th className="px-4 py-3 text-center">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.productName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.stockType === 'DECLASSE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {item.stockType === 'DECLASSE' ? 'Déclassé' : 'Neuf'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-black">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold">{item.unitPrice.toLocaleString()} DH</td>
                        <td className="px-4 py-3 text-right font-black text-blue-600">{item.totalPrice.toLocaleString()} DH</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => removeItemFromCart(idx)} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center p-6 bg-slate-900 rounded-[2rem] text-white animate-fadeIn gap-6">
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total TTC Panier</p><h4 className="text-3xl font-black tabular-nums mt-1">{totalTTC.toLocaleString()} <span className="text-sm font-bold opacity-50">DH</span></h4></div>
              <button onClick={() => editingDelivery ? handleFinalSubmit() : setShowCommissionModal(true)} className="w-full md:w-auto bg-white text-slate-900 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-90 text-center">
                {editingDelivery ? "METTRE À JOUR LE BL" : "VALIDER LE BON DE LIVRAISON"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100"><History className="w-5 h-5 text-slate-400" /></div><h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">HISTORIQUE DES VENTES</h3></div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-slate-400 uppercase">DU</span><input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={dateStart} onChange={(e) => setDateStart(e.target.value)} /></div>
              <div className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-slate-400 uppercase">AU</span><input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} /></div>
            </div>
            <button onClick={() => { setDateStart(''); setDateEnd(''); }} className="w-full md:w-auto px-6 py-2.5 border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"><RotateCcw className="w-3.5 h-3.5" /> RÉINITIALISER</button>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-10 py-6">N° BL</th><th className="px-6 py-6">DATE</th><th className="px-6 py-6">CLIENT</th><th className="px-6 py-6 text-center">CONTENU</th><th className="px-6 py-6 text-right">TOTAL TTC</th><th className="px-10 py-6 text-center">ACTIONS</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDeliveries.map((d) => {
                const hasDeclassed = d.items.some(i => i.stockType === 'DECLASSE');
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                    <td className="px-10 py-6 font-black text-slate-900 text-sm tracking-tight">{d.deliveryNumber}</td>
                    <td className="px-6 py-6 text-xs font-bold text-slate-400">{d.date}</td>
                    <td className="px-6 py-6"><span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200/50">{d.clientName}</span></td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex justify-center gap-1">
                        <Package className="w-3.5 h-3.5 text-slate-300" />
                        {hasDeclassed && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" title="Contient du déclassé" />}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right font-black text-slate-900 tabular-nums">{formatAmount(d.totalTTC)} <span className="text-[10px] opacity-50 ml-1">DH</span></td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <button onClick={() => setDetailDelivery(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye className="w-5 h-5" /></button>
                        <button onClick={() => startEdit(d)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit3 className="w-5 h-5" /></button>
                        {!isReadOnly && !isAlreadyInvoiced(d) && (
                          <button 
                            onClick={() => onGenerateInvoice?.(d)} 
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Générer Facture"
                          >
                            <FilePlus className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => generatePDF(d)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><FileText className="w-5 h-5" /></button>
                        {!isReadOnly && !isAlreadyInvoiced(d) && <button onClick={() => setDeliveryToDelete({id: d.id, number: d.deliveryNumber})} className="p-2 text-rose-200 hover:text-rose-600 transition-colors"><Trash2 className="w-5 h-5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RETOUR MARCHANDISE */}
      {returningItem && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 text-center space-y-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">🔄</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Retour Marchandise</h3>
            <p className="text-sm text-slate-500 font-medium">Quantité défectueuse à retourner en stock déclassé :</p>
            <input type="number" min="1" max={returningItem.maxQty} className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl text-center text-rose-600 outline-none" value={returnQty} onChange={(e) => setReturnQty(Math.min(returningItem.maxQty, parseInt(e.target.value) || 1))} />
            <p className="text-[10px] font-black text-slate-400 uppercase">Max retournable : {returningItem.maxQty}</p>
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={() => {
                  onReturnItem?.(returningItem.dlvId, returningItem.itemIdx, returnQty);
                  setReturningItem(null);
                  setReturnQty(1);
                  setDetailDelivery(null);
                }} 
                className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
              >
                CONFIRMER LE RETOUR
              </button>
              <button onClick={() => setReturningItem(null)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">ANNULER</button>
            </div>
          </div>
        </div>
      )}

      {showCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 text-center space-y-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">💸</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Commission Vente</h3>
            <input type="number" className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl text-center text-blue-600 outline-none" value={commissionAmount || ''} onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={handleFinalSubmit} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all">CONFIRMER ET CRÉER LE BL</button>
              <button onClick={() => setShowCommissionModal(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">SANS COMMISSION</button>
            </div>
          </div>
        </div>
      )}

      {detailDelivery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden h-[90vh] flex flex-col border border-white/20">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><div><h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{detailDelivery.deliveryNumber}</h3><p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-1">Détails de la livraison</p></div><button onClick={() => setDetailDelivery(null)} className="text-slate-300 hover:text-slate-900 p-2"><X className="w-8 h-8" /></button></div>
            <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-slate-50 p-6 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">CLIENT</p><p className="text-lg font-black text-slate-800">{detailDelivery.clientName}</p></div><div className="bg-slate-50 p-6 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">DATE & PAIEMENT</p><p className="text-lg font-black text-slate-800">{detailDelivery.date} — {detailDelivery.paymentMethod}</p></div></div>
              <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm table-container">
                <table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase"><tr><th className="px-8 py-5">Produit</th><th className="px-4 py-5 text-center">Type</th><th className="px-4 py-5 text-center">Qté</th><th className="px-6 py-5 text-right">P.U. HT</th><th className="px-8 py-5 text-right">Total HT</th><th className="px-6 py-5 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{detailDelivery.items.map((item, idx) => (<tr key={idx} className="hover:bg-slate-50/30 transition-colors"><td className="px-8 py-5"><p className="font-black text-slate-800">{item.productName}</p><p className="text-[10px] text-slate-400">{item.sku}</p></td><td className="px-4 py-5 text-center"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.stockType === 'DECLASSE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.stockType}</span></td><td className="px-4 py-5 text-center font-black">{item.quantity}</td><td className="px-6 py-5 text-right font-bold">{item.unitPrice.toLocaleString()} DH</td><td className="px-8 py-5 text-right font-black">{item.totalPrice.toLocaleString()} DH</td><td className="px-6 py-5 text-center">
                  {!isReadOnly && item.quantity > 0 && (
                    <button 
                      onClick={() => { setReturningItem({ dlvId: detailDelivery.id, itemIdx: idx, maxQty: item.quantity }); setReturnQty(1); }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 mx-auto"
                      title="Signaler un retour défectueux"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase">Retour</span>
                    </button>
                  )}
                </td></tr>))}</tbody></table>
              </div>
            </div>
            <div className="p-6 md:p-8 border-t bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6"><div className="text-center md:text-left"><p className="text-[10px] font-black text-slate-400 uppercase">Total TTC Document</p><p className="text-3xl font-black text-slate-900">{detailDelivery.totalTTC.toLocaleString()} DH</p></div><button onClick={() => generatePDF(detailDelivery)} className="w-full md:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"><FileText className="w-5 h-5 text-blue-400" /> TÉLÉCHARGER PDF</button></div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deliveryToDelete} onOpenChange={() => setDeliveryToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl max-w-[90vw] md:max-w-lg">
          <AlertDialogHeader><div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 text-3xl">🗑️</div><AlertDialogTitle className="text-3xl font-black text-slate-900">Supprimer la vente ?</AlertDialogTitle><AlertDialogDescription className="text-slate-500 font-medium text-lg leading-relaxed mt-2">Cette action est définitive. Le Bon de Livraison {deliveryToDelete?.number} sera supprimé et le stock sera réajusté.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-4 flex flex-col md:flex-row"><AlertDialogCancel className="rounded-2xl font-bold px-8 border-slate-200 text-slate-500 uppercase text-[10px]">ANNULER</AlertDialogCancel><AlertDialogAction onClick={() => { if (deliveryToDelete && onDeleteDelivery) onDeleteDelivery(deliveryToDelete.id, deliveryToDelete.number); setDeliveryToDelete(null); }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black px-8 uppercase text-[10px]">SUPPRIMER DÉFINITIVEMENT</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Deliveries;