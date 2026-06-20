'use client';

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { parseCsv, mapCsvRowsToSchema } from '@/lib/utils';
import { setDocumentNonBlocking, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface CsvImportButtonProps {
  tableName: string;
  schemaKeys: string[];
  defaultValues?: Record<string, any>;
  idPrefix: string;
  className?: string;
  onImportComplete?: () => void;
}

export const CsvImportButton: React.FC<CsvImportButtonProps> = ({
  tableName,
  schemaKeys,
  defaultValues = {},
  idPrefix,
  className = "px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm",
  onImportComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const configCol = useMemoFirebase(() => doc(firestore, 'config', 'app'), [firestore]);
  const { data: config } = useDoc(configCol);
  const effectiveUid = user?.email === 'tarik@tpmaster.ma' ? config?.adminUid : user?.uid;

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!effectiveUid) {
      alert("Erreur: ID utilisateur non disponible.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const csvRows = parseCsv(text);
        if (csvRows.length === 0) {
          alert("Le fichier CSV est vide ou invalide (entêtes manquantes).");
          return;
        }

        const mapped = mapCsvRowsToSchema(csvRows, schemaKeys, defaultValues);
        if (mapped.length === 0) {
          alert("Aucune donnée valide n'a pu être extraite du fichier CSV.");
          return;
        }

        // Import sequentially in non-blocking way
        for (let i = 0; i < mapped.length; i++) {
          const item = mapped[i];
          // Use item.id if provided in CSV, otherwise generate a unique one
          const id = item.id || `${idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
          const docRef = doc(firestore, 'users', effectiveUid, tableName, id);
          setDocumentNonBlocking(docRef, { ...item, id });
        }

        alert(`Succès ! ${mapped.length} lignes importées dans la table ${tableName}.`);
        if (onImportComplete) {
          onImportComplete();
        }
      } catch (err) {
        console.error("Error importing CSV:", err);
        alert("Une erreur est survenue lors de l'importation du fichier CSV.");
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be uploaded again
    e.target.value = '';
  };

  return (
    <>
      <button 
        type="button" 
        onClick={handleButtonClick} 
        className={className}
      >
        <Upload className="w-4 h-4" /> IMPORTER CSV
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
    </>
  );
};
