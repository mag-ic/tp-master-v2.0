'use client';
import Help from '@/components/Help';
import { useUser, useFirestore, useAuth, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, getDocs, doc } from 'firebase/firestore';

export default function HelpPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  const handleDeleteAllData = async () => {
    if (!user) {
      alert("Vous n'êtes pas connecté.");
      return;
    }

    if (window.confirm(`⚠️ ATTENTION : Voulez-vous vraiment supprimer TOUTES les données pour l'utilisateur ${user.email} ? Cette action est irréversible.`)) {
      try {
        const collectionsToDelete = [
          'products', 'contacts', 'payments', 'charges', 
          'deliveries', 'stockEntries', 'savTickets', 'cheques',
          'apports', 'spareParts', 'supplierAdvances'
        ];

        for (const colName of collectionsToDelete) {
          const colRef = collection(firestore, 'users', user.uid, colName);
          const snapshot = await getDocs(colRef);
          if (!snapshot.empty) {
            snapshot.forEach(docSnapshot => {
              deleteDocumentNonBlocking(docSnapshot.ref);
            });
          }
        }

        alert("Toutes vos données ont été supprimées. Vous allez être déconnecté.");
        await auth.signOut();
        
      } catch (error) {
        console.error("Erreur lors de la suppression des données :", error);
        alert("Une erreur est survenue lors de la suppression des données.");
      }
    }
  };

  const handleImportData = async (backupData: any) => {
    if (!user) {
      alert("Vous n'êtes pas connecté.");
      return;
    }

    try {
      const collectionsToImport = [
        'products', 'contacts', 'payments', 'charges', 
        'deliveries', 'stockEntries', 'savTickets', 'cheques',
        'apports', 'spareParts', 'supplierAdvances'
      ];

      let importCount = 0;
      for (const colName of collectionsToImport) {
        const items = backupData[colName];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.id) {
              const docRef = doc(firestore, 'users', user.uid, colName, item.id);
              setDocumentNonBlocking(docRef, item, { merge: true });
              importCount++;
            }
          }
        }
      }

      alert(`${importCount} éléments importés avec succès !`);
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de l'importation des données :", error);
      alert("Une erreur est survenue lors de l'importation des données.");
    }
  };

  return <Help onReset={handleDeleteAllData} onImport={handleImportData} />;
}
