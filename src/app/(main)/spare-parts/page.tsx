
'use client';
import SpareParts from '@/components/SpareParts';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product, SparePart } from '@/lib/types';

export default function SparePartsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
  const isReadOnly = user?.email === 'tarik@tpmaster.ma';

  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const sparePartsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'spareParts') : null, [effectiveUid, firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);
  const { data: spareParts, isLoading: isLoadingParts } = useCollection<SparePart>(sparePartsCol);

  const handleAddPart = (partData: Omit<SparePart, 'id'>) => {
    if (!effectiveUid || !sparePartsCol || isReadOnly) return;
    const id = `sp-${Date.now()}`;
    const newPart: SparePart = { ...partData, id };
    setDocumentNonBlocking(doc(sparePartsCol, id), newPart, { merge: false });
  };

  const handleEditPart = (id: string, partData: Partial<SparePart>) => {
    if (!effectiveUid || isReadOnly) return;
    setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'spareParts', id), partData, { merge: true });
  };

  const handleDeletePart = (id: string) => {
    if (!effectiveUid || isReadOnly) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'spareParts', id));
  };

  const isLoading = isLoadingProducts || isLoadingParts || !effectiveUid;

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Maintenance...</p>
        </div>
    );
  }

  return (
    <SpareParts
      products={products || []}
      spareParts={spareParts || []}
      onAddPart={handleAddPart}
      onEditPart={handleEditPart}
      onDeletePart={handleDeletePart}
      isReadOnly={isReadOnly}
    />
  );
}
