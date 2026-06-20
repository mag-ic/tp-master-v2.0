'use client';
import Inventory from '@/components/Inventory';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product } from '@/lib/types';

export default function InventoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
  const isReadOnly = user?.email === 'tarik@tpmaster.ma';

  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const { data: products, isLoading } = useCollection<Product>(productsCol);

  const handleUpdateStock = (id: string, newStock: number) => {
    if (!effectiveUid || isReadOnly) return;
    const docRef = doc(firestore, 'users', effectiveUid, 'products', id);
    setDocumentNonBlocking(docRef, { stock: newStock }, { merge: true });
  };

  const handleAddProduct = (productData: Omit<Product, 'id'>) => {
    if (!effectiveUid || !productsCol || isReadOnly) return;
    const id = `prod-${Date.now()}`;
    const newProduct: Product = { ...productData, id };
    const docRef = doc(productsCol, id);
    setDocumentNonBlocking(docRef, newProduct, { merge: false });
  };

  const handleEditProduct = (id: string, productData: Partial<Product>) => {
    if (!effectiveUid || isReadOnly) return;
    const docRef = doc(firestore, 'users', effectiveUid, 'products', id);
    setDocumentNonBlocking(docRef, productData, { merge: true });
  };

  const handleDeleteProduct = (id: string) => {
    if (!effectiveUid || isReadOnly) return;
    const docRef = doc(firestore, 'users', effectiveUid, 'products', id);
    deleteDocumentNonBlocking(docRef);
  };

  if (isLoading || !effectiveUid) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Catalogue...</p>
        </div>
    );
  }

  return (
    <Inventory
      products={products || []}
      onUpdateStock={handleUpdateStock}
      onAddProduct={handleAddProduct}
      onEditProduct={handleEditProduct}
      onDeleteProduct={handleDeleteProduct}
      isReadOnly={isReadOnly}
    />
  );
}