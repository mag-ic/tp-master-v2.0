'use client';
import React from 'react';

interface HelpProps {
  onReset: () => void;
  onImport: (backupData: any) => Promise<void>;
}

const Help: React.FC<HelpProps> = ({ onReset, onImport }) => {
  const [importing, setImporting] = React.useState(false);

  const handleAutoImport = async () => {
    setImporting(true);
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        throw new Error("Fichier de sauvegarde Backup_TPMaster*.json non trouvé à la racine.");
      }
      const json = await response.json();
      if (!json.data) {
        alert("Le format du fichier de sauvegarde est invalide.");
        return;
      }
      await onImport(json.data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de l'importation automatique.");
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data) {
          alert("Format de fichier invalide. Le fichier doit contenir un objet 'data'.");
          return;
        }
        setImporting(true);
        await onImport(json.data);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier JSON.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };
  const sections = [
    {
      title: "Tableau de Bord",
      icon: "📊",
      description: "Aperçu global de votre activité. Vous y trouverez la valeur totale de votre stock, les alertes de rupture et les montants en attente de paiement.",
      tips: ["Vérifiez quotidiennement les alertes de stock bas pour éviter les ruptures."]
    },
    {
      title: "Catalogue Stock",
      icon: "📦",
      description: "Gérez votre liste de produits. Vous pouvez ajouter de nouveaux articles, modifier leurs caractéristiques ou exporter votre inventaire au format CSV.",
      tips: ["Utilisez le SKU pour identifier rapidement vos produits.", "L'export CSV est idéal pour vos inventaires physiques."]
    },
    {
      title: "Contacts (Clients/Fournisseurs)",
      icon: "👥",
      description: "Répertoire de vos partenaires commerciaux. Séparez distinctement vos clients pour les ventes et vos fournisseurs pour les achats.",
      tips: ["Renseignez bien les emails et téléphones pour les rappels de paiement."]
    },
    {
      title: "Entrées de Stock (Achats)",
      icon: "📥",
      description: "Module de réception de marchandises. Lorsque vous enregistrez une entrée, le stock physique augmente et une fiche de paiement est automatiquement générée dans la section 'ACHAT'.",
      tips: ["Le prix saisi est le prix TTC.", "Cliquez sur 'Suivre' pour voir la dette liée à cet achat."]
    },
    {
      title: "Ventes (Livraisons)",
      icon: "🚚",
      description: "Enregistrez vos sorties de stock. Chaque livraison diminue le stock physique. Vous pouvez générer un Bon de Livraison (PDF) et transformer la livraison en facture.",
      tips: ["Une vente peut être convertie en facture client en un clic."]
    },
    {
      title: "Finance & Trésorerie",
      icon: "💰",
      description: "Le cœur financier de l'app. Divisé en 4 onglets :",
      subSections: [
        { name: "FACTURES", desc: "Suivi des encaissements clients." },
        { name: "ACHAT", desc: "Suivi des paiements fournisseurs (stock)." },
        { name: "CHARGES", desc: "Gestion des frais fixes (Loyer, Salaire...)." },
        { name: "RAPPORT", desc: "Analyse visuelle des revenus vs dépenses." }
      ],
      tips: ["Utilisez le bouton 'Régler' pour enregistrer des paiements partiels ou totaux."]
    },
    {
      title: "Assistant IA",
      icon: "✨",
      description: "Utilisez la puissance de Gemini pour analyser vos données. Posez des questions sur vos tendances de vente ou vos points critiques.",
      tips: ["Exemple : 'Quels produits dois-je commander en priorité ?'", "'Analyse ma rentabilité ce mois-ci.'"]
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-20">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800">Centre d'Aide & Documentation</h2>
        <p className="text-slate-500 font-medium text-lg">Tout ce qu'il faut savoir pour maîtriser StockMaster AI.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
                {section.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{section.title}</h3>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed">
              {section.description}
            </p>

            {section.subSections && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {section.subSections.map((sub, sidx) => (
                  <div key={sidx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-black text-blue-600 text-[10px] uppercase">{sub.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sub.desc}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-slate-50">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Astuce Pro
              </p>
              <ul className="space-y-1">
                {section.tips.map((tip, tidx) => (
                  <li key={tidx} className="text-xs text-slate-500 flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold">Informations Système</h3>
            <p className="text-slate-400 text-sm mt-2">
              Vos données sont stockées de manière sécurisée sur les serveurs de Firebase.
            </p>
          </div>
          <div className="pt-4 flex flex-wrap gap-2">
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Version</p>
              <p className="font-bold text-xs">2.5.0 Professional</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Statut</p>
              <p className="font-bold text-xs">Prêt à l'usage</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-[2.5rem] p-8 border border-blue-100 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-black text-blue-800">Sauvegarde & Restauration</h3>
            <p className="text-blue-600/70 text-sm font-medium mt-2">
              Restaurez les données du projet à partir de votre fichier de backup local.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            <button 
              onClick={handleAutoImport}
              disabled={importing}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition active:scale-95 disabled:bg-slate-300 disabled:shadow-none text-xs uppercase tracking-widest"
            >
              {importing ? "Importation..." : "Importer Backup Racine"}
            </button>
            <label className="block w-full bg-white border border-blue-200 text-blue-700 py-4 rounded-2xl font-black text-center cursor-pointer transition active:scale-95 text-xs uppercase tracking-widest hover:bg-blue-50/50">
              Choisir un fichier JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="hidden" 
                disabled={importing}
              />
            </label>
          </div>
        </div>

        <div className="bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-black text-rose-800">Zone de Danger</h3>
            <p className="text-rose-600/70 text-sm font-medium mt-2">
              Si vous souhaitez effacer toutes vos données actuelles pour recommencer à zéro.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={onReset}
              className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition active:scale-95 text-xs uppercase tracking-widest"
            >
              Réinitialiser le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;