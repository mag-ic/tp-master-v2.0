
'use client';
import Treasury from '@/components/Treasury';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Payment, Charge, PaymentStatus, PaymentMethod, Apport } from '@/lib/types';

export default function TreasuryPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
    const { data: config } = useDoc(configCol);
    const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;
    const isReadOnly = user?.email === 'tarik@tpmaster.ma';

    const paymentsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'payments') : null, [effectiveUid, firestore]);
    const chargesCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'charges') : null, [effectiveUid, firestore]);
    const apportsCol = useMemoFirebase(() => effectiveUid ? collection(firestore, 'users', effectiveUid, 'apports') : null, [effectiveUid, firestore]);
    
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsCol);
    const { data: charges, isLoading: isLoadingCharges } = useCollection<Charge>(chargesCol);
    const { data: apports, isLoading: isLoadingApports } = useCollection<Apport>(apportsCol);

    const handleInternalTransfer = (amount: number, date: string) => {
        if (!effectiveUid || !chargesCol || !paymentsCol || isReadOnly) return;
        const transferId = `trans-${Date.now()}`;
        const idCharge = `chg-out-${transferId}`;
        const idPayment = `pay-in-${transferId}`;
        
        const cashOut: Charge = { id: idCharge, description: `Versement Bancaire (Sortie Caisse)`, category: 'Transfert Interne', amount, paidAmount: amount, status: PaymentStatus.PAID, date, method: PaymentMethod.ESPECES };
        const bankIn: Payment = { id: idPayment, invoiceNumber: `VERS-${Date.now().toString().slice(-4)}`, customerName: 'Dépôt Bancaire', amount, paidAmount: amount, date, dueDate: date, status: PaymentStatus.PAID, method: PaymentMethod.VIREMENT, isReceived: true, items: [{ productName: 'Transfert de fonds Caisse vers Banque', sku: 'TRANS', quantity: 1, unitPriceHT: amount / 1.2, totalHT: amount / 1.2 }]};
        
        setDocumentNonBlocking(doc(chargesCol, idCharge), cashOut, { merge: false });
        setDocumentNonBlocking(doc(paymentsCol, idPayment), bankIn, { merge: false });
    };

    const handleCapitalIncrease = (amount: number, date: string, method: PaymentMethod) => {
        if (!effectiveUid || !apportsCol || isReadOnly) return;
        const id = `app-${Date.now()}`;
        const newApport: Apport = {
            id,
            reference: `APP-${new Date(date).getFullYear()}-${Date.now().toString().slice(-4)}`,
            amount,
            date,
            method,
            description: 'Apport en Compte Courant'
        };
        setDocumentNonBlocking(doc(apportsCol, id), newApport, { merge: false });
    };
    
    const isLoading = isLoadingPayments || isLoadingCharges || isLoadingApports || !effectiveUid;
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement Flux...</p>
            </div>
        );
    }

    return (
        <Treasury
            payments={payments || []}
            charges={charges || []}
            apports={apports || []}
            onInternalTransfer={handleInternalTransfer}
            onCapitalIncrease={handleCapitalIncrease}
            isReadOnly={isReadOnly}
        />
    );
}
