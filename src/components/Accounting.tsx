'use client';
import React, { useState, useMemo } from 'react';
import { Product, Payment, Charge, Entity, PaymentMethod, Apport, SupplierAdvance } from '@/lib/types';
import { Download, TrendingUp, TrendingDown, BookOpen, Calculator, Search, FileText, PieChart, BarChart3, ListFilter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AccountingProps {
  products: Product[];
  payments: Payment[];
  charges: Charge[];
  contacts: Entity[];
  apports: Apport[];
  advances: SupplierAdvance[];
}

const PCM = {
  STOCKS: '3111',
  CLIENTS: '3421',
  AVANCES_FOURNIS: '3411',
  TVA_RECUP: '3455',
  BANQUE: '5141',
  CAISSE: '5161',
  FOURNISSEURS: '4411',
  TVA_FACT: '4455',
  ASSOCIES_CC: '4463',
  VENTES: '7111',
  ACHATS_MARCHANDISES: '6111',
  CHARGES_EXTERNES: '613/614',
};

const Accounting: React.FC<AccountingProps> = ({ products, payments, charges, contacts, apports, advances = [] }) => {
  const [activeView, setActiveTab] = useState<'bilan' | 'cpc' | 'grandlivre'>('bilan');
  const [selectedAccount, setSelectedAccount] = useState<string>('3421');

  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    const parts = Math.abs(val).toFixed(2).split('.');
    // Utilisation d'un espace insécable (\u00A0) pour éviter les retours à la ligne
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    const sign = val < 0 ? '-' : '';
    return `${sign}${parts[0]},${parts[1]}`;
  };

  const bilanPCM = useMemo(() => {
    const stockValue = Number(products.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0), 0).toFixed(2));
    const clientReceivables = Number(payments.reduce((acc, p) => acc + Math.max(0, (Number(p.amount) || 0) - (Number(p.paidAmount) || 0)), 0).toFixed(2));
    const supplierAdvances = Number(advances.filter(a => a.status === 'DISPONIBLE').reduce((acc, a) => acc + a.amount, 0).toFixed(2));
    const associatesLoans = Number(apports.reduce((acc, a) => acc + (Number(a.amount) || 0), 0).toFixed(2));
    
    // TVA Calculations
    const tvaRecuperable = Number(charges.reduce((acc, c) => acc + (c.amount - c.amount / 1.2), 0).toFixed(2));
    const tvaFacturee = Number(payments.reduce((acc, p) => acc + (p.amount - p.amount / 1.2), 0).toFixed(2));

    const supplierPayables = Number(charges.filter(c => c.category === 'Marchandises').reduce((acc, c) => acc + Math.max(0, (Number(c.amount) || 0) - (Number(c.paidAmount) || 0)), 0).toFixed(2));
    const otherPayables = Number(charges.filter(c => !['Marchandises', 'Avance Fournisseur'].includes(c.category)).reduce((acc, c) => acc + Math.max(0, (Number(c.amount) || 0) - (Number(c.paidAmount) || 0)), 0).toFixed(2));
    
    const cashInHand = Number((payments.reduce((acc, p) => {
        const cashHist = p.history?.filter(h => h.method === PaymentMethod.ESPECES).reduce((sum, h) => sum + h.amount, 0) || 0;
        return acc + (p.method === PaymentMethod.ESPECES ? p.paidAmount : cashHist);
    }, 0) + apports.filter(a => a.method === PaymentMethod.ESPECES).reduce((acc, a) => acc + a.amount, 0) - charges.reduce((acc, c) => {
        const cashHist = c.history?.filter(h => h.method === PaymentMethod.ESPECES).reduce((sum, h) => sum + h.amount, 0) || 0;
        return acc + (c.method === PaymentMethod.ESPECES ? c.paidAmount : cashHist);
    }, 0)).toFixed(2));

    const bankIn = payments.reduce((acc, p) => {
        const bankHist = p.history?.filter(h => h.method !== PaymentMethod.ESPECES).reduce((sum, h) => sum + h.amount, 0) || 0;
        return acc + (p.method !== PaymentMethod.ESPECES ? p.paidAmount : bankHist);
    }, 0) + apports.filter(a => a.method !== PaymentMethod.ESPECES).reduce((acc, a) => acc + a.amount, 0);
    
    const bankOut = charges.reduce((acc, c) => {
        const bankHist = c.history?.filter(h => h.method !== PaymentMethod.ESPECES).reduce((sum, h) => sum + h.amount, 0) || 0;
        return acc + (c.method !== PaymentMethod.ESPECES ? c.paidAmount : bankHist);
    }, 0);
    const bankBalance = Number((bankIn - bankOut).toFixed(2));

    return {
      actif: [
        { code: '3111', label: 'Stocks de marchandises', value: stockValue },
        { code: '3421', label: 'Clients et comptes rattachés', value: clientReceivables },
        { code: '3411', label: 'Fournisseurs - Avances versées', value: supplierAdvances },
        { code: '3455', label: 'État - TVA récupérable', value: tvaRecuperable },
        { code: '5141', label: 'Banques', value: Math.max(0, bankBalance) },
        { code: '5161', label: 'Caisses', value: Math.max(0, cashInHand) },
      ],
      passif: [
        { code: '4411', label: 'Fournisseurs et cptes rattachés', value: supplierPayables },
        { code: '4455', label: 'État - TVA facturée', value: tvaFacturee },
        { code: '4463', label: 'Associés - Comptes courants', value: associatesLoans },
        { code: '4480', label: 'Autres créanciers', value: otherPayables },
        { code: '5541', label: 'Banques (Solde créditeur)', value: bankBalance < 0 ? Math.abs(bankBalance) : 0 },
      ]
    };
  }, [products, payments, charges, apports, advances]);

  const cpcPCM = useMemo(() => {
    const totalSales = Number(payments.reduce((acc, p) => acc + (p.amount / 1.2), 0).toFixed(2));
    const purchaseGoods = Number(charges.filter(c => c.category === 'Marchandises').reduce((acc, c) => acc + (c.amount / 1.2), 0).toFixed(2));
    const otherCharges = Number(charges.filter(c => !['Marchandises', 'Avance Fournisseur', 'Transfert Interne'].includes(c.category)).reduce((acc, c) => acc + (c.amount / 1.2), 0).toFixed(2));

    return {
      produits: [
        { code: '7111', label: 'Ventes de marchandises (HT)', value: totalSales },
      ],
      charges: [
        { code: '6111', label: 'Achats de marchandises (HT)', value: purchaseGoods },
        { code: '613/614', label: 'Charges externes (HT)', value: otherCharges },
      ],
      resultat: Number((totalSales - (purchaseGoods + otherCharges)).toFixed(2))
    };
  }, [payments, charges]);

  const grandLivreData = useMemo(() => {
    let operations: any[] = [];
    if (selectedAccount === '3421') {
      payments.forEach(p => {
        operations.push({ date: p.date, ref: p.invoiceNumber, label: `Facture Client : ${p.customerName}`, debit: p.amount, credit: 0 });
        p.history?.forEach(h => {
          operations.push({ date: h.date, ref: `${p.invoiceNumber}-R`, label: `Règlement Client (${h.method})`, debit: 0, credit: h.amount });
        });
      });
    } else if (selectedAccount === '3411') {
      advances.forEach(a => {
        operations.push({ date: a.date, ref: `ADV-${a.id.slice(-4)}`, label: `Avance versée : ${a.supplierName}`, debit: a.amount, credit: 0 });
        if (a.status === 'UTILISÉE') {
          operations.push({ date: a.date, ref: `ADV-USE`, label: `Apurement avance (${a.linkedEntryNumber || 'BC'})`, debit: 0, credit: a.amount });
        }
      });
    } else if (selectedAccount === '4463') {
      apports.forEach(a => {
        operations.push({ date: a.date, ref: a.reference, label: a.description, debit: 0, credit: a.amount });
      });
    } else if (selectedAccount === '4411') {
      charges.filter(c => c.category === 'Marchandises').forEach(c => {
        operations.push({ date: c.date, ref: c.reference || 'ACHAT', label: `Facture Fournisseur : ${c.supplierName}`, debit: 0, credit: c.amount });
        c.history?.forEach(h => {
          operations.push({ date: h.date, ref: `${c.reference}-P`, label: `Paiement Fournisseur (${h.method})`, debit: h.amount, credit: 0 });
        });
      });
    } else if (selectedAccount === '3455') {
      charges.forEach(c => {
        const tva = c.amount - (c.amount / 1.2);
        operations.push({ date: c.date, ref: c.reference || 'CHG', label: `TVA / ${c.supplierName || c.description}`, debit: tva, credit: 0 });
      });
    } else if (selectedAccount === '4455') {
      payments.forEach(p => {
        const tva = p.amount - (p.amount / 1.2);
        operations.push({ date: p.date, ref: p.invoiceNumber, label: `TVA / ${p.customerName}`, debit: 0, credit: tva });
      });
    } else if (selectedAccount === '5141' || selectedAccount === '5161') {
      const targetMethod = selectedAccount === '5141' ? [PaymentMethod.VIREMENT, PaymentMethod.CHEQUE] : [PaymentMethod.ESPECES];
      
      // Payments
      payments.forEach(p => {
        p.history?.filter(h => targetMethod.includes(h.method)).forEach(h => {
          operations.push({ date: h.date, ref: p.invoiceNumber, label: `Encaissement ${p.customerName}`, debit: h.amount, credit: 0 });
        });
      });

      // Apports
      apports.filter(a => targetMethod.includes(a.method)).forEach(a => {
          operations.push({ date: a.date, ref: a.reference, label: `Encaissement APPORT`, debit: a.amount, credit: 0 });
      });

      // Charges (includes Advances charges)
      charges.forEach(c => {
        c.history?.filter(h => targetMethod.includes(h.method)).forEach(h => {
          operations.push({ date: h.date, ref: c.reference || 'CHG', label: `Décaissement ${c.supplierName || c.description}`, debit: 0, credit: h.amount });
        });
      });
    } else if (selectedAccount === '7111') {
        payments.forEach(p => { operations.push({ date: p.date, ref: p.invoiceNumber, label: `Vente ${p.customerName}`, debit: 0, credit: p.amount / 1.2 }); });
    } else if (selectedAccount === '6111') {
        charges.filter(c => c.category === 'Marchandises').forEach(c => { operations.push({ date: c.date, ref: c.reference || 'ACH', label: `Achat ${c.supplierName}`, debit: c.amount / 1.2, credit: 0 }); });
    }
    operations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return operations.map(op => { balance += (op.debit - op.credit); return { ...op, balance: Number(balance.toFixed(2)) }; });
  }, [selectedAccount, payments, charges, apports, advances]);

  const generateSagePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('fr-FR');
    
    // Header Style Sage 100
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TRADING PARTNERSHIPS S.A.R.L", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Exercice : 2024", 14, 20);
    doc.text(`Date d'édition : ${today}`, pageWidth - 14, 15, { align: 'right' });
    doc.text("Devise : Dirham (MAD)", pageWidth - 14, 20, { align: 'right' });

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, 25, pageWidth - 14, 25);

    if (activeView === 'bilan') {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BILAN COMPTABLE (MODÈLE PCM)", pageWidth / 2, 35, { align: 'center' });

      autoTable(doc, {
        startY: 45,
        head: [['Code', 'ACTIF', 'Montant', 'Code', 'PASSIF', 'Montant']],
        body: bilanPCM.actif.map((item, i) => [
          item.code, item.label, formatAmount(item.value),
          bilanPCM.passif[i]?.code || '', bilanPCM.passif[i]?.label || '', formatAmount(bilanPCM.passif[i]?.value || 0)
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 2: { halign: 'right' }, 5: { halign: 'right' } }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.text(`Total Actif : ${formatAmount(bilanPCM.actif.reduce((a,b)=>a+b.value,0))} DH`, 14, finalY);
      doc.text(`Total Passif : ${formatAmount(bilanPCM.passif.reduce((a,b)=>a+b.value,0))} DH`, pageWidth - 14, finalY, { align: 'right' });

    } else if (activeView === 'cpc') {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("COMPTE DE PRODUITS ET CHARGES (CPC)", pageWidth / 2, 35, { align: 'center' });

      autoTable(doc, {
        startY: 45,
        head: [['Code', 'Nature', 'PRODUITS', 'Code', 'Nature', 'CHARGES']],
        body: cpcPCM.produits.map((item, i) => [
          item.code, item.label, formatAmount(item.value),
          cpcPCM.charges[i]?.code || '', cpcPCM.charges[i]?.label || '', formatAmount(cpcPCM.charges[i]?.value || 0)
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 2: { halign: 'right' }, 5: { halign: 'right' } }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(11);
      doc.setTextColor(cpcPCM.resultat >= 0.01 ? [16, 185, 129] : (cpcPCM.resultat <= -0.01 ? [244, 63, 94] : [0, 0, 0]));
      doc.text(`RÉSULTAT NET DE L'EXERCICE : ${formatAmount(cpcPCM.resultat)} DH`, 14, finalY);

    } else {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`GRAND LIVRE : COMPTE ${selectedAccount}`, pageWidth / 2, 35, { align: 'center' });

      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Référence', 'Libellé de l\'écriture', 'Débit', 'Crédit', 'Solde']],
        body: grandLivreData.map(op => [
          op.date, op.ref, op.label, 
          op.debit > 0 ? formatAmount(op.debit) : '', 
          op.credit > 0 ? formatAmount(op.credit) : '', 
          formatAmount(op.balance)
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
      });
    }

    doc.save(`Sage100_${activeView.toUpperCase()}_${today.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Calculator className="w-6 h-6" /></div>
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Expertise Comptable</h2><p className="text-sm text-slate-500 font-medium">Standard Plan Comptable Marocain (PCM)</p></div>
        </div>
        <div className="flex bg-white p-1 rounded-full border border-slate-100 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <button onClick={() => setActiveTab('bilan')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeView === 'bilan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Bilan</button>
          <button onClick={() => setActiveTab('cpc')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeView === 'cpc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>CPC</button>
          <button onClick={() => setActiveTab('grandlivre')} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeView === 'grandlivre' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Grand Livre</button>
        </div>
      </header>

      {activeView === 'bilan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bento-card overflow-hidden">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center"><span className="font-black text-xs uppercase tracking-widest">ACTIF (EMPLOIS)</span><PieChart className="w-5 h-5 opacity-50" /></div>
            <div className="p-8 space-y-4">
              {bilanPCM.actif.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex flex-col"><span className="text-[10px] font-black text-emerald-600">{item.code}</span><span className="text-sm font-bold text-slate-700">{item.label}</span></div><span className="font-black text-slate-900 tabular-nums whitespace-nowrap">{formatAmount(item.value)} DH</span></div>
              ))}
              <div className="pt-6 border-t flex justify-between items-center"><span className="font-black text-sm uppercase text-slate-400">Total Actif</span><span className="text-2xl font-black text-slate-900 whitespace-nowrap">{formatAmount(bilanPCM.actif.reduce((a,b) => a + b.value, 0))} DH</span></div>
            </div>
          </div>
          <div className="bento-card overflow-hidden">
            <div className="p-6 bg-rose-600 text-white flex justify-between items-center"><span className="font-black text-xs uppercase tracking-widest">PASSIF (RESSOURCES)</span><BarChart3 className="w-5 h-5 opacity-50" /></div>
            <div className="p-8 space-y-4">
              {bilanPCM.passif.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex flex-col"><span className="text-[10px] font-black text-rose-600">{item.code}</span><span className="text-sm font-bold text-slate-700">{item.label}</span></div><span className="font-black text-slate-900 tabular-nums whitespace-nowrap">{formatAmount(item.value)} DH</span></div>
              ))}
              <div className="pt-6 border-t flex justify-between items-center"><span className="font-black text-sm uppercase text-slate-400">Total Passif</span><span className="text-2xl font-black text-slate-900 whitespace-nowrap">{formatAmount(bilanPCM.passif.reduce((a,b) => a + b.value, 0))} DH</span></div>
            </div>
          </div>
          <div className="lg:col-span-2 flex justify-end"><button onClick={generateSagePDF} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><FileText className="w-5 h-5 text-indigo-400" /> Exporter Bilan (Style Sage)</button></div>
        </div>
      )}

      {activeView === 'cpc' && (
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bento-card overflow-hidden">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12"><div className="space-y-6"><h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-4">PRODUITS (Classe 7)</h3>{cpcPCM.produits.map((item, idx) => (<div key={idx} className="flex justify-between"><span className="text-sm font-bold text-slate-600">{item.code} - {item.label}</span><span className="font-black text-emerald-600 whitespace-nowrap">+{formatAmount(item.value)} DH</span></div>))}</div><div className="space-y-6"><h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-4">CHARGES (Classe 6)</h3>{cpcPCM.charges.map((item, idx) => (<div key={idx} className="flex justify-between"><span className="text-sm font-bold text-slate-600">{item.code} - {item.label}</span><span className="font-black text-rose-600 whitespace-nowrap">-{formatAmount(item.value)} DH</span></div>))}</div></div>
            <div className="bg-slate-900 p-10 text-white flex flex-col md:flex-row justify-between items-center gap-8"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RÉSULTAT NET COMPTABLE (HT)</p><h4 className={`text-5xl font-black tabular-nums whitespace-nowrap ${cpcPCM.resultat >= 0.01 ? 'text-emerald-400' : (cpcPCM.resultat <= -0.01 ? 'text-rose-400' : 'text-white')}`}>{formatAmount(cpcPCM.resultat)} <span className="text-2xl font-bold opacity-50">DH</span></h4></div><button onClick={generateSagePDF} className="w-full md:w-auto bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-50">Générer CPC (Style Sage)</button></div>
          </div>
        </div>
      )}

      {activeView === 'grandlivre' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bento-card p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Plan de Comptes PCM</h3>
            <div className="space-y-2">
              {[
                { id: '3421', label: 'Clients', icon: '👥' },
                { id: '3411', label: 'Avances Fournis.', icon: '💸' },
                { id: '3455', label: 'TVA Récupérable', icon: '⚖️' },
                { id: '4463', label: 'Apports Associés', icon: '💰' },
                { id: '4411', label: 'Fournisseurs', icon: '🚛' },
                { id: '4455', label: 'TVA Facturée', icon: '🧾' },
                { id: '5141', label: 'Banques', icon: '🏦' },
                { id: '5161', label: 'Caisse', icon: '💸' },
                { id: '7111', label: 'Ventes Marchandises', icon: '📈' },
                { id: '6111', label: 'Achats Marchandises', icon: '📦' },
              ].map(acc => (
                <button key={acc.id} onClick={() => setSelectedAccount(acc.id)} className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center gap-4 ${selectedAccount === acc.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}><span className="text-lg">{acc.icon}</span><div className="flex flex-col"><span className="font-black text-xs">{acc.id}</span><span className="text-[10px] font-bold uppercase opacity-80">{acc.label}</span></div></button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="bento-card overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30"><div><h3 className="text-xl font-black text-slate-800">Grand Livre : {selectedAccount}</h3><p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">Détail analytique des écritures (TVA Incluse)</p></div><button onClick={generateSagePDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"><Download className="w-4 h-4" /> Export Sage</button></div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th className="px-8 py-5">Date</th><th className="px-6 py-5">Référence</th><th className="px-6 py-5 Libellé">Libellé</th><th className="px-6 py-5 text-right">Débit</th><th className="px-6 py-5 text-right">Crédit</th><th className="px-8 py-5 text-right">Solde</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grandLivreData.map((op, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors"><td className="px-8 py-5 text-xs font-bold text-slate-400 whitespace-nowrap">{op.date}</td><td className="px-6 py-5 font-black text-slate-700 uppercase text-xs whitespace-nowrap">{op.ref}</td><td className="px-6 py-5 text-xs font-bold text-slate-500">{op.label}</td><td className="px-6 py-5 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">{op.debit > 0 ? formatAmount(op.debit) : ''}</td><td className="px-6 py-5 text-right font-black text-emerald-600 tabular-nums whitespace-nowrap">{op.credit > 0 ? formatAmount(op.credit) : ''}</td><td className="px-8 py-5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">{formatAmount(op.balance)} DH</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
