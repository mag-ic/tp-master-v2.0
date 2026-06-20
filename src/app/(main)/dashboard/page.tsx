'use client';
import Dashboard from '@/components/Dashboard';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product, Payment, Charge } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Détection du UID effectif (soit le sien, soit celui de l'admin si consultant)
  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;

  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
  const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
  const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);

  const isLoading = isLoadingProducts || isLoadingPayments || isLoadingCharges || !effectiveUid;

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Initialisation des données...</p>
        </div>
    );
  }

  return <Dashboard products={products || []} payments={payments || []} charges={charges || []} />;
}