'use client';
import Payments from '@/components/Payments';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Payment, Charge, Entity, Cheque, PaymentStatus, Product, StockEntry, PaymentMethod, Apport } from '@/lib/types';

function PaymentsPageComponent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') as 'list' | 'achat' | 'charges' | 'apports' | 'report' | null;
  
  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
  const isReadOnly = user?.email === 'tarik@tpmaster.ma';

  const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
  const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);
  const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
  const chequesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'cheques') : null, [effectiveUid, firestore]);
  const deliveriesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'deliveries') : null, [effectiveUid, firestore]);
  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const stockEntriesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'stockEntries') : null, [effectiveUid, firestore]);
  const apportsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'apports') : null, [effectiveUid, firestore]);

  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
  const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);
  const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
  const { data: deliveries, isLoading: isLoadingDeliveries } = useCollection(deliveriesCol);
  const { data: products } = useCollection<Product>(productsCol);
  const { data: stockEntries } = useCollection<StockEntry>(stockEntriesCol);
  const { data: apports, isLoading: isLoadingApports } = useCollection<Apport>(apportsCol);

  const handleUpdatePayment = (id: string, updates: Partial<Payment>) => {
      if (!effectiveUid || isReadOnly) return;
      setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'payments', id), updates, { merge: true });
  };

  const handleDeletePayment = (id: string) => {
      if (!effectiveUid || isReadOnly) return;
      deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'payments', id));
  };

  const handleUpdateCharge = (id: string, updates: Partial<Charge>) => {
      if (!effectiveUid || isReadOnly) return;
      setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'charges', id), updates, { merge: true });
  };

  const handleAddCharge = (charge: Omit<Charge, 'id' | 'paidAmount' | 'status'>) => {
      if (!effectiveUid || !chargesCol || isReadOnly) return;
      const id = `chg-${Date.now()}`;
      const newCharge: Charge = { ...charge, id, paidAmount: 0, status: PaymentStatus.UNPAID };
      setDocumentNonBlocking(doc(chargesCol, id), newCharge, { merge: false });
  };

  const handleDeleteCharge = (id: string) => {
      if (!effectiveUid || isReadOnly) return;
      deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'charges', id));
  };

  const handleAddCheque = (cheque: Omit<Cheque, 'id'>) => {
    if (!effectiveUid || !chequesCol || isReadOnly) return;
    const id = `chq-${Date.now()}`;
    const newCheque = { ...cheque, id };
    setDocumentNonBlocking(doc(chequesCol, id), newCheque, { merge: false });
  };

  const handleCreateStockEntry = (entryData: Omit<StockEntry, 'id' | 'entryNumber' | 'purchaseOrderNumber'>) => {
    if (!effectiveUid || !productsCol || !chargesCol || !stockEntriesCol || isReadOnly) return;

    const now = new Date();
    const newEntryId = `ste-${Date.now()}`;
    const yearShort = now.getFullYear().toString().slice(-2);
    // Nouveau format BC-YY-XXXXX (5 chiffres)
    const entryNumber = `BC-${yearShort}-${((stockEntries || []).length + 1).toString().padStart(5, '0')}`;

    // Update stocks
    entryData.items.forEach(item => {
        const product = products?.find(p => p.id === item.productId);
        if (product) {
            const updated = { ...product, stock: product.stock + item.quantity, price: item.costPrice };
            setDocumentNonBlocking(doc(productsCol, product.id), updated, { merge: true });
        }
    });

    // Create the linked charge (Achat de marchandises)
    const chargeId = `chg-auto-${Date.now()}`;
    const newCharge: Charge = { 
        id: chargeId, reference: entryNumber, supplierName: entryData.supplierName, 
        description: `Achat multi-produits (${entryData.items.length} art.)`, 
        category: 'Marchandises', amount: entryData.totalTTC, paidAmount: 0, 
        status: PaymentStatus.UNPAID, date: entryData.date, method: PaymentMethod.VIREMENT 
    };
    setDocumentNonBlocking(doc(chargesCol, chargeId), newCharge, { merge: false });

    // Create the stock entry
    const newEntry: StockEntry = { 
        ...entryData, 
        id: newEntryId, 
        entryNumber, 
        purchaseOrderNumber: entryNumber,
        attachmentUrl: entryData.attachmentUrl || null 
    };
    setDocumentNonBlocking(doc(stockEntriesCol, newEntryId), newEntry, { merge: false });
  };

  const handleDeleteApport = (id: string) => {
    if (!effectiveUid || isReadOnly) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'apports', id));
  };

  const isLoading = isLoadingPayments || isLoadingCharges || isLoadingContacts || isLoadingDeliveries || isLoadingApports || !effectiveUid;

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Finance...</p>
          </div>
      );
  }

  return (
    <Payments 
        payments={payments || []}
        onUpdatePayment={handleUpdatePayment}
        onDeletePayment={handleDeletePayment}
        charges={charges || []}
        onUpdateCharge={handleUpdateCharge}
        onAddCharge={handleAddCharge}
        onDeleteCharge={handleDeleteCharge}
        onAddCheque={handleAddCheque}
        contacts={contacts || []}
        activeTabProp={activeTab || 'list'}
        isReadOnly={isReadOnly}
        products={products || []}
        onCreateStockEntry={handleCreateStockEntry}
        apports={apports || []}
        onDeleteApport={handleDeleteApport}
    />
  );
}

export default function PaymentsPage() {
    return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PaymentsPageComponent />
    </Suspense>
  );
}
