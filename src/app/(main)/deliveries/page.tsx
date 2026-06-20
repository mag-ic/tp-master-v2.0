'use client';
import Deliveries from '@/components/Deliveries';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Product, Entity, Delivery, Payment, Charge, PaymentStatus, PaymentMethod, InvoiceItem } from '@/lib/types';

function DeliveriesPageComponent() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedDeliveryId = searchParams.get('highlight');

  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
  const isReadOnly = user?.email === 'tarik@tpmaster.ma';

  const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
  const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
  const deliveriesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'deliveries') : null, [effectiveUid, firestore]);
  const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
  const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);
  const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
  const { data: deliveries, isLoading: isLoadingDeliveries } = useCollection<Delivery>(deliveriesCol);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
  const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);

  const clients = useMemo(() => (contacts || []).filter(c => c.type === 'client'), [contacts]);

  const handleCreateDelivery = (deliveryData: Omit<Delivery, 'id' | 'deliveryNumber'>, commission?: number) => {
      if (!effectiveUid || !productsCol || !deliveriesCol || !chargesCol || isReadOnly) return;
      const now = new Date();
      const newId = `dlv-${Date.now()}`;
      const yearShort = now.getFullYear().toString().slice(-2);
      const blNumber = `BL-${yearShort}-${((deliveries || []).length + 1).toString().padStart(4, '0')}`;
      
      // Update stocks (Neuf ou Déclassé)
      deliveryData.items.forEach(item => {
          const product = products?.find(p => p.id === item.productId);
          if (product) {
              const stockField = item.stockType === 'DECLASSE' ? 'declassedStock' : 'stock';
              const updated = { ...product, [stockField]: (product[stockField] || 0) - item.quantity };
              setDocumentNonBlocking(doc(productsCol, product.id), updated, { merge: true });
          }
      });

      const newDelivery: Delivery = { ...deliveryData, id: newId, deliveryNumber: blNumber };
      setDocumentNonBlocking(doc(deliveriesCol, newId), newDelivery, { merge: false });
      
      if (commission && commission > 0) {
          const commId = `chg-com-${Date.now()}`;
          const commissionCharge: Charge = { id: commId, reference: blNumber, supplierName: 'Apporteur d\'affaires', description: `Commission sur vente ${blNumber}`, category: 'Commission', amount: commission, paidAmount: 0, status: PaymentStatus.UNPAID, date: deliveryData.date, method: PaymentMethod.ESPECES };
          setDocumentNonBlocking(doc(chargesCol, commId), commissionCharge, { merge: false });
      }
  };

  const handleUpdateDelivery = (id: string, updates: Partial<Delivery>) => {
    if (!effectiveUid || !productsCol || !deliveriesCol || isReadOnly) return;
    
    const oldDelivery = deliveries?.find(d => d.id === id);
    if (!oldDelivery) return;

    // 1. Remettre l'ancien stock vendu
    oldDelivery.items.forEach(oldItem => {
        const product = products?.find(p => p.id === oldItem.productId);
        if (product) {
            const stockField = oldItem.stockType === 'DECLASSE' ? 'declassedStock' : 'stock';
            setDocumentNonBlocking(doc(productsCol, product.id), { 
                [stockField]: (product[stockField] || 0) + oldItem.quantity 
            }, { merge: true });
        }
    });

    // 2. Déduire le nouveau stock (après une courte attente simulée ou simplement par mise à jour d'un objet local)
    // Pour éviter les conflits de merge immédiats, on calcule les nouveaux totaux
    updates.items?.forEach(newItem => {
        const product = products?.find(p => p.id === newItem.productId);
        if (product) {
            const stockField = newItem.stockType === 'DECLASSE' ? 'declassedStock' : 'stock';
            // Note: On utilise le stock actuel mais comme on a mis à jour juste avant, 
            // dans un vrai système on attendrait la promesse. Ici, on fait confiance au non-blocking.
            // Pour plus de sécurité, on pourrait aussi calculer le diff global par produit.
            const currentVal = product[stockField] || 0;
            // On fait l'ajustement inverse
            setDocumentNonBlocking(doc(productsCol, product.id), { 
                [stockField]: currentVal + (oldDelivery.items.find(i => i.productId === newItem.productId && i.stockType === newItem.stockType)?.quantity || 0) - newItem.quantity 
            }, { merge: true });
        }
    });

    setDocumentNonBlocking(doc(deliveriesCol, id), updates, { merge: true });
  };

  const handleReturnItem = (deliveryId: string, itemIdx: number, returnQty: number) => {
    if (!effectiveUid || !productsCol || !deliveriesCol || !paymentsCol || isReadOnly) return;
    
    const delivery = deliveries?.find(d => d.id === deliveryId);
    if (!delivery || !delivery.items[itemIdx]) return;

    const item = delivery.items[itemIdx];
    const product = products?.find(p => p.id === item.productId);
    if (!product) return;

    // 1. Déplacer dans le stock déclassé
    setDocumentNonBlocking(doc(productsCol, product.id), { 
        declassedStock: (product.declassedStock || 0) + returnQty 
    }, { merge: true });

    // 2. Mettre à jour le BL (Déduire la quantité et le montant)
    const newItems = [...delivery.items];
    const newItem = { ...newItems[itemIdx] };
    const deductionHT = newItem.unitPrice * returnQty;
    newItem.quantity -= returnQty;
    newItem.totalPrice -= deductionHT;
    newItems[itemIdx] = newItem;

    const newTotalHT = delivery.totalHT - deductionHT;
    const newTotalTTC = newTotalHT * 1.20;

    setDocumentNonBlocking(doc(deliveriesCol, deliveryId), {
        items: newItems,
        totalHT: newTotalHT,
        totalTTC: newTotalTTC
    }, { merge: true });

    // 3. Mettre à jour la facture liée (gratter le montant)
    const invoiceNumber = delivery.deliveryNumber.replace('BL-', 'INV-');
    const payment = payments?.find(p => p.invoiceNumber === invoiceNumber);
    if (payment) {
        const newInvoiceItems = payment.items.map(pi => {
            if (pi.productName === newItem.productName) {
                return { ...pi, quantity: pi.quantity - returnQty, totalHT: pi.totalHT - deductionHT };
            }
            return pi;
        });
        
        // Recalcul du statut si déjà payé partiellement
        const status = (newTotalTTC - payment.paidAmount) < 0.01 ? PaymentStatus.PAID : (payment.paidAmount <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL);

        setDocumentNonBlocking(doc(paymentsCol, payment.id), {
            items: newInvoiceItems,
            amount: newTotalTTC,
            status
        }, { merge: true });
    }
  };

  const handleGenerateInvoice = (delivery: Delivery) => {
      if (!effectiveUid || !paymentsCol || isReadOnly) return;
      const isCash = delivery.paymentMethod === PaymentMethod.ESPECES;
      const invoiceNumber = delivery.deliveryNumber.replace('BL-', 'INV-');
      const invoiceItems: InvoiceItem[] = delivery.items.map(item => ({ productName: item.productName, sku: item.sku, quantity: item.quantity, unitPriceHT: item.unitPrice, totalHT: item.totalPrice }));
      const payId = `inv-gen-${Date.now()}`;
      const newPayment: Payment = { id: payId, invoiceNumber, customerName: delivery.clientName, amount: delivery.totalTTC, paidAmount: isCash ? delivery.totalTTC : 0, date: delivery.date, dueDate: delivery.date, status: isCash ? PaymentStatus.PAID : PaymentStatus.UNPAID, method: delivery.paymentMethod, isReceived: isCash, items: invoiceItems };
      setDocumentNonBlocking(doc(paymentsCol, payId), newPayment, { merge: false });
      router.push('/payments');
  };
  
  const handleDeleteDelivery = (deliveryId: string, deliveryNumber: string) => {
    if (!effectiveUid || isReadOnly) return;
    const expectedInvoiceNumber = deliveryNumber.replace('BL-', 'INV-');
    const isAlreadyInvoiced = (payments || []).some(p => p.invoiceNumber === expectedInvoiceNumber);
    if (isAlreadyInvoiced) {
        alert("Suppression impossible : une facture a déjà été générée pour cette livraison.");
        return;
    }

    const dlv = deliveries?.find(d => d.id === deliveryId);
    if (dlv && productsCol) {
        dlv.items.forEach(item => {
            const product = products?.find(p => p.id === item.productId);
            if (product) {
                const stockField = item.stockType === 'DECLASSE' ? 'declassedStock' : 'stock';
                setDocumentNonBlocking(doc(productsCol, product.id), {
                    [stockField]: (product[stockField] || 0) + item.quantity
                }, { merge: true });
            }
        });
    }

    deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'deliveries', deliveryId));
  };

  const isLoading = isLoadingProducts || isLoadingContacts || isLoadingDeliveries || isLoadingPayments || isLoadingCharges || !effectiveUid;
  
  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Ventes...</p>
          </div>
      );
  }

  return (
      <Deliveries
          products={products || []}
          clients={clients}
          deliveries={deliveries || []}
          onCreateDelivery={handleCreateDelivery}
          onUpdateDelivery={handleUpdateDelivery}
          onReturnItem={handleReturnItem}
          onGenerateInvoice={handleGenerateInvoice}
          existingPayments={payments || []}
          highlightedDeliveryId={highlightedDeliveryId}
          onClearHighlight={() => router.replace('/deliveries')}
          charges={charges || []}
          onDeleteDelivery={handleDeleteDelivery}
          isReadOnly={isReadOnly}
      />
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <DeliveriesPageComponent />
    </Suspense>
  );
}
