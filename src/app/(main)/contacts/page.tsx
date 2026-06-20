'use client';
import Contacts from '@/components/Contacts';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Entity, Payment, Charge } from '@/lib/types';

export default function ContactsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
    const { data: config } = useDoc(configCol);
    const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
    const isReadOnly = user?.email === 'tarik@tpmaster.ma';

    const contactsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'contacts') : null, [effectiveUid, firestore]);
    const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
    const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);
    
    const { data: contacts, isLoading: isLoadingContacts } = useCollection<Entity>(contactsCol);
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
    const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);

    const handleAddContact = (contact: Omit<Entity, 'id'>) => {
        if (!effectiveUid || !contactsCol || isReadOnly) return;
        const id = `ent-${Date.now()}`;
        const newContact = { ...contact, id };
        setDocumentNonBlocking(doc(contactsCol, id), newContact, { merge: false });
    };

    const handleEditContact = (id: string, contactData: Partial<Entity>) => {
        if (!effectiveUid || isReadOnly) return;
        setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'contacts', id), contactData, { merge: true });
    };

    const handleDeleteContact = (id: string) => {
        if (!effectiveUid || isReadOnly) return;
        deleteDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'contacts', id));
    };

    const isLoading = isLoadingContacts || isLoadingPayments || isLoadingCharges || !effectiveUid;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Partenaires...</p>
            </div>
        );
    }

    return (
        <Contacts
            contacts={contacts || []}
            onAddContact={handleAddContact}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            payments={payments || []}
            charges={charges || []}
            isReadOnly={isReadOnly}
        />
    );
}