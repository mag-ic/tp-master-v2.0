'use client';
import StockEntries from '@/components/StockEntries';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product, Entity, StockEntry, Charge, PaymentStatus, PaymentMethod, SupplierAdvance } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function StockEntriesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
    const { data: config } = useDoc(configCol);
    const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
    const isReadOnly = user?.email === 'tarik@tpmaster.ma';

    const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
    const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
    const stockEntriesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'stockEntries') : null, [effectiveUid, firestore]);
    const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);
    const advancesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'supplierAdvances') : null, [effectiveUid, firestore]);
    
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);
    const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
    const { data: stockEntries, isLoading: isLoadingStockEntries } = useCollection<StockEntry>(stockEntriesCol);
    const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);
    const { data: advances, isLoading: isLoadingAdvances } = useCollection<SupplierAdvance>(advancesCol);

    const suppliers = useMemo(() => (contacts || []).filter(c => c.type === 'supplier'), [contacts]);

    const handleCreateStockEntry = (entryData: Omit<StockEntry, 'id' | 'entryNumber' | 'purchaseOrderNumber'>, advanceIds: string[]) => {
        if (!effectiveUid || !productsCol || !chargesCol || !stockEntriesCol || !advancesCol || isReadOnly) return;

        const now = new Date();
        const newEntryId = `ste-${Date.now()}`;
        const yearShort = now.getFullYear().toString().slice(-2);
        const entryNumber = `BC-${yearShort}-${((stockEntries || []).length + 1).toString().padStart(5, '0')}`;

        // 1. Update stocks
        entryData.items.forEach(item => {
            const product = products?.find(p => p.id === item.productId);
            if (product) {
                const updated = { ...product, stock: product.stock + item.quantity, price: item.costPrice };
                setDocumentNonBlocking(doc(productsCol, product.id), updated, { merge: true });
            }
        });

        // 2. Handle selected advances
        let totalUsedAdvances = 0;
        advanceIds.forEach(advId => {
            const adv = advances?.find(a => a.id === advId);
            if (adv && adv.status === 'DISPONIBLE') {
                totalUsedAdvances += adv.amount;
                setDocumentNonBlocking(doc(advancesCol, advId), { 
                    status: 'UTILISÉE', 
                    linkedEntryNumber: entryNumber 
                }, { merge: true });
            }
        });

        // 3. Create the linked charge (Achat de marchandises)
        const chargeId = `chg-auto-${Date.now()}`;
        const history = totalUsedAdvances > 0 ? [{ 
            date: entryData.date, 
            amount: totalUsedAdvances, 
            method: PaymentMethod.AVANCE 
        }] : [];

        // Correct status based on advances used
        const status = (entryData.totalTTC - totalUsedAdvances) < 0.01 ? PaymentStatus.PAID : (totalUsedAdvances > 0 ? PaymentStatus.PARTIAL : PaymentStatus.UNPAID);

        const newCharge: Charge = { 
            id: chargeId, 
            reference: entryNumber, 
            supplierName: entryData.supplierName, 
            description: `Achat multi-produits (${entryData.items.length} art.)`, 
            category: 'Marchandises', 
            amount: entryData.totalTTC, 
            paidAmount: totalUsedAdvances, 
            status, 
            date: entryData.date, 
            method: PaymentMethod.VIREMENT,
            history
        };
        setDocumentNonBlocking(doc(chargesCol, chargeId), newCharge, { merge: false });

        // 4. Create the stock entry record
        const newEntry: StockEntry = { 
            ...entryData, 
            id: newEntryId, 
            entryNumber, 
            purchaseOrderNumber: entryNumber,
            attachmentUrl: entryData.attachmentUrl || null,
            linkedAdvanceIds: advanceIds
        };
        setDocumentNonBlocking(doc(stockEntriesCol, newEntryId), newEntry, { merge: false });
    };

    const handleUpdateStockEntry = (id: string, updates: Partial<StockEntry>) => {
        if (!effectiveUid || !productsCol || !stockEntriesCol || !chargesCol || isReadOnly) return;
        
        const oldEntry = stockEntries?.find(e => e.id === id);
        if (!oldEntry) return;

        oldEntry.items.forEach(oldItem => {
            const product = products?.find(p => p.id === oldItem.productId);
            if (product) {
                const stockSansAncien = product.stock - oldItem.quantity;
                const newItem = updates.items?.find(i => i.productId === oldItem.productId);
                const nouvelleQuantite = newItem ? newItem.quantity : 0;
                const nouveauPrix = newItem ? newItem.costPrice : product.price;
                
                setDocumentNonBlocking(doc(productsCol, product.id), { 
                    stock: stockSansAncien + nouvelleQuantite,
                    price: nouveauPrix
                }, { merge: true });
            }
        });

        updates.items?.forEach(newItem => {
            const isNewItem = !oldEntry.items.some(oi => oi.productId === newItem.productId);
            if (isNewItem) {
                const product = products?.find(p => p.id === newItem.productId);
                if (product) {
                    setDocumentNonBlocking(doc(productsCol, product.id), { 
                        stock: product.stock + newItem.quantity,
                        price: newItem.costPrice
                    }, { merge: true });
                }
            }
        });

        const relatedCharge = charges?.find(c => c.reference === oldEntry.entryNumber);
        if (relatedCharge && updates.totalTTC !== undefined) {
            setDocumentNonBlocking(doc(chargesCol, relatedCharge.id), { 
                amount: updates.totalTTC,
                supplierName: updates.supplierName || relatedCharge.supplierName,
                date: updates.date || relatedCharge.date
            }, { merge: true });
        }

        setDocumentNonBlocking(doc(stockEntriesCol, id), updates, { merge: true });
    };

    const handleDeleteStockEntry = (entryId: string, entryNumber: string) => {
        if (!effectiveUid || !chargesCol || !charges || isReadOnly) return;
        const relatedCharge = charges.find(c => c.reference === entryNumber && c.category === 'Marchandises');
        if (relatedCharge && relatedCharge.paidAmount > 0) {
            alert(`Suppression impossible : une partie ou la totalité de l'achat lié (${relatedCharge.amount.toLocaleString()} DH) a déjà été réglée ou couverte par une avance.`);
            return;
        }
        deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'stockEntries', entryId));
        if (relatedCharge) deleteDocumentNonBlocking(doc(chargesCol, relatedCharge.id));
    };

    const handleCreateAdvance = (advanceData: Omit<SupplierAdvance, 'id' | 'status'>) => {
        if (!effectiveUid || !advancesCol || isReadOnly) return;
        const id = `adv-${Date.now()}`;
        const newAdvance: SupplierAdvance = { ...advanceData, id, status: 'DISPONIBLE' };
        
        // Also create a linked charge for treasury tracking (Compte 3411)
        const chargeId = `chg-adv-${id}`;
        const newCharge: Charge = {
            id: chargeId,
            reference: `ADV-${id.slice(-4)}`,
            supplierName: advanceData.supplierName,
            description: `Avance Fournisseur : ${advanceData.description}`,
            category: 'Avance Fournisseur',
            amount: advanceData.amount,
            paidAmount: advanceData.amount,
            status: PaymentStatus.PAID,
            date: advanceData.date,
            method: advanceData.method,
            history: [{ date: advanceData.date, amount: advanceData.amount, method: advanceData.method }]
        };

        setDocumentNonBlocking(doc(advancesCol, id), newAdvance, { merge: false });
        setDocumentNonBlocking(doc(chargesCol, chargeId), newCharge, { merge: false });
    };

    const handleDeleteAdvance = (id: string) => {
        if (!effectiveUid || isReadOnly) return;
        const adv = advances?.find(a => a.id === id);
        if (adv?.status === 'UTILISÉE') {
            alert("Impossible de supprimer une avance déjà utilisée.");
            return;
        }
        deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'supplierAdvances', id));
        deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'charges', `chg-adv-${id}`));
    };

    const handleNavigateToFinance = () => router.push('/payments?tab=achat');

    const isLoading = isLoadingProducts || isLoadingContacts || isLoadingStockEntries || isLoadingCharges || isLoadingAdvances || !effectiveUid;
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Logistique...</p>
            </div>
        );
    }

    return (
        <StockEntries
            products={products || []}
            suppliers={suppliers}
            entries={stockEntries || []}
            advances={advances || []}
            onCreateEntry={handleCreateStockEntry}
            onUpdateEntry={handleUpdateStockEntry}
            onDeleteEntry={handleDeleteStockEntry}
            onCreateAdvance={handleCreateAdvance}
            onDeleteAdvance={handleDeleteAdvance}
            onNavigateToFinance={handleNavigateToFinance}
            isReadOnly={isReadOnly}
        />
    );
}
