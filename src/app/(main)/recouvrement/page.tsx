'use client';
import Recouvrement from '@/components/Recouvrement';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Cheque, ChequeStatus, Payment, Charge, PaymentStatus, PaymentMethod } from '@/lib/types';

export default function RecouvrementPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
    const { data: config } = useDoc(configCol);
    const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;

    const chequesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'cheques') : null, [effectiveUid, firestore]);
    const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
    const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);

    const { data: cheques, isLoading: isLoadingCheques } = useCollection<Cheque>(chequesCol);
    const { data: payments } = useCollection<Payment>(paymentsCol);
    const { data: charges } = useCollection<Charge>(chargesCol);

    const handleUpdateCheque = (id: string | string[], updates: Partial<Cheque>) => {
        if (!effectiveUid) return;
        const ids = Array.isArray(id) ? id : [id];
        
        ids.forEach(targetId => {
            const currentCheque = cheques?.find(c => c.id === targetId);
            if (!currentCheque) return;

            // LOGIQUE IMPAYÉ : Si le chèque passe en BOUNCED (Impayé), on déduit le montant du réglé dans Finance
            if (updates.status === ChequeStatus.BOUNCED && currentCheque.status !== ChequeStatus.BOUNCED) {
                const today = new Date().toISOString().split('T')[0];
                
                if (currentCheque.type === 'IN') { // Client
                    const linkedPayment = payments?.find(p => p.invoiceNumber === currentCheque.reference);
                    if (linkedPayment) {
                        const newPaid = Math.max(0, Number((linkedPayment.paidAmount - currentCheque.amount).toFixed(2)));
                        const newStatus = newPaid <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL;
                        
                        setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'payments', linkedPayment.id), {
                            paidAmount: newPaid,
                            status: newStatus,
                            history: [...(linkedPayment.history || []), { 
                                date: today, 
                                amount: -currentCheque.amount, 
                                method: PaymentMethod.CHEQUE 
                            }]
                        }, { merge: true });
                    }
                } else { // Fournisseur / Charge
                    const linkedCharge = charges?.find(c => c.reference === currentCheque.reference || c.description === currentCheque.reference);
                    if (linkedCharge) {
                        const newPaid = Math.max(0, Number((linkedCharge.paidAmount - currentCheque.amount).toFixed(2)));
                        const newStatus = newPaid <= 0 ? PaymentStatus.UNPAID : PaymentStatus.PARTIAL;
                        
                        setDocumentNonBlocking(doc(firestore, 'users', effectiveUid, 'charges', linkedCharge.id), {
                            paidAmount: newPaid,
                            status: newStatus,
                            history: [...(linkedCharge.history || []), { 
                                date: today, 
                                amount: -currentCheque.amount, 
                                method: PaymentMethod.CHEQUE 
                            }]
                        }, { merge: true });
                    }
                }
            }

            // Mise à jour standard du chèque
            const docRef = doc(firestore, 'users', effectiveUid, 'cheques', targetId);
            setDocumentNonBlocking(docRef, updates, { merge: true });
        });
    };

    if (isLoadingCheques || !effectiveUid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Synchronisation Cloud...</p>
            </div>
        );
    }

    return <Recouvrement cheques={cheques || []} onUpdateCheque={handleUpdateCheque} />;
}
