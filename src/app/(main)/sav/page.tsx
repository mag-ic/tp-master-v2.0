'use client';
import SAV from '@/components/SAV';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { SAVTicket, Entity, Product, Charge, PaymentStatus } from '@/lib/types';
import { useMemo } from 'react';

export default function SAVPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Détection du UID effectif pour le mode consultant
    const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
    const { data: config } = useDoc(configCol);
    const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
    const isReadOnly = user?.email === 'tarik@tpmaster.ma';

    const savTicketsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'savTickets') : null, [effectiveUid, firestore]);
    const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
    const productsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'products') : null, [effectiveUid, firestore]);
    const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);

    const { data: tickets, isLoading: isLoadingSavTickets } = useCollection<SAVTicket>(savTicketsCol);
    const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCol);

    const clients = useMemo(() => (contacts || []).filter(c => c.type === 'client'), [contacts]);

    const handleCreateTicket = (data: any) => { 
        if(!effectiveUid || !savTicketsCol || isReadOnly) return; 
        const id = `sav-${Date.now()}`; 
        const t = {...data, id, ticketNumber: `SAV-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0], cost: 0}; 
        setDocumentNonBlocking(doc(savTicketsCol, id), t, { merge: false }); 
    };

    const handleUpdateSAVTicket = (id: string, updates: Partial<SAVTicket>) => {
        if (!effectiveUid || isReadOnly) return;
        const updatedTicket = { ...updates, updatedAt: new Date().toISOString().split('T')[0] };
        setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'savTickets', id), updatedTicket, { merge: true });
    };

    const handleDeleteSAVTicket = (id: string) => {
        if (effectiveUid && !isReadOnly) {
            deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'savTickets', id));
        }
    };
    
    const handleAddCharge = (charge: Omit<Charge, 'id' | 'paidAmount' | 'status'>) => {
      if (!effectiveUid || !chargesCol || isReadOnly) return;
      const id = `chg-${Date.now()}`;
      const newCharge: Charge = { ...charge, id, paidAmount: 0, status: PaymentStatus.UNPAID };
      const docRef = doc(chargesCol, id);
      setDocumentNonBlocking(docRef, newCharge, { merge: false });
    };

    const isLoading = isLoadingSavTickets || isLoadingContacts || isLoadingProducts || !effectiveUid;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Synchronisation SAV...</p>
            </div>
        );
    }

    return (
        <SAV
            tickets={tickets || []}
            clients={clients}
            products={products || []}
            onCreateTicket={handleCreateTicket}
            onUpdateTicket={handleUpdateSAVTicket}
            onDeleteTicket={handleDeleteSAVTicket}
            onAddCharge={handleAddCharge}
            isReadOnly={isReadOnly}
        />
    );
}
