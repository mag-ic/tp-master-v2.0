'use client';
import Accounting from '@/components/Accounting';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product, Payment, Charge, Entity, Apport, SupplierAdvance } from '@/lib/types';

export default function AccountingPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;

  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
  const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);
  const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
  const apportsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'apports') : null, [effectiveUid, firestore]);
  const advancesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'supplierAdvances') : null, [effectiveUid, firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
  const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);
  const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
  const { data: apports, isLoading: isLoadingApports } = useCollection<Apport>(apportsCol);
  const { data: advances, isLoading: isLoadingAdvances } = useCollection<SupplierAdvance>(advancesCol);

  const isLoading = isLoadingProducts || isLoadingPayments || isLoadingCharges || isLoadingContacts || isLoadingApports || isLoadingAdvances || !effectiveUid;

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Audit Financier...</p>
        </div>
    );
  }

  return (
    <Accounting 
      products={products || []} 
      payments={payments || []} 
      charges={charges || []} 
      contacts={contacts || []}
      apports={apports || []}
      advances={advances || []}
    />
  );
}
