
'use client';
import React, { useState, useMemo } from 'react';
import { Product, SparePart } from '@/lib/types';
import { exportToCsv } from '@/lib/utils';
import { Download, Trash2, Edit3, Settings2, Search, Lock, Plus, X, Package } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SparePartsProps {
  products: Product[];
  spareParts: SparePart[];
  onAddPart: (part: Omit<SparePart, 'id'>) => void;
  onEditPart: (id: string, part: Partial<SparePart>) => void;
  onDeletePart: (id: string) => void;
  isReadOnly?: boolean;
}

const SpareParts: React.FC<SparePartsProps> = ({ 
  products, spareParts, onAddPart, onEditPart, onDeletePart, isReadOnly = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partToDelete, setPartToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', sku: '', productId: '', stock: 0, price: 0, category: 'Pièce Rechange'
  });

  const filteredParts = useMemo(() => {
    return spareParts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProduct = selectedProductId === 'all' || p.productId === selectedProductId;
      return matchSearch && matchProduct;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [spareParts, searchTerm, selectedProductId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const product = products.find(p => p.id === formData.productId);
    if (!product) { alert("Veuillez sélectionner un produit parent."); return; }

    const finalData = { ...formData, productName: product.name };

    if (editingPart) {
      onEditPart(editingPart.id, finalData);
    } else {
      onAddPart(finalData);
    }
    setShowAddModal(false);
    setEditingPart(null);
    setFormData({ name: '', sku: '', productId: '', stock: 0, price: 0, category: 'Pièce Rechange' });
  };

  const openEdit = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      sku: part.sku,
      productId: part.productId,
      stock: part.stock,
      price: part.price,
      category: part.category
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-blue-600" />
            Stock Pièces de Rechange
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gérez vos composants liés aux produits principaux.</p>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => exportToCsv('pieces_rechange.csv', filteredParts)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" />Exporter CSV
            </button>
            {!isReadOnly && (
              <button onClick={() => { setEditingPart(null); setShowAddModal(true); }} className="btn-primary flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />Nouvelle Pièce
              </button>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 p-4 rounded-[2.5rem] border border-white/80 shadow-sm backdrop-blur-sm">
        <div className="relative md:col-span-2">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Recherche par nom, référence..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-full px-4 py-3 bg-white font-bold border border-slate-100 rounded-2xl outline-none text-slate-700 text-sm appearance-none cursor-pointer" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="all">Tous les produits parents</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParts.map((p) => (
          <div key={p.id} className="bento-card p-6 flex flex-col group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform"><Settings2 className="w-6 h-6 text-blue-600" /></div>
              {!isReadOnly && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 className="w-5 h-5" /></button>
                  <button onClick={() => setPartToDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{p.productName}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-500 uppercase">{p.sku}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-1 leading-tight">{p.name}</h3>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coût Unitaire</p>
                <p className="text-lg font-black text-slate-900 mt-1">{p.price.toLocaleString()} DH</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Stock Disponible</p>
                <p className={`text-2xl font-black ${p.stock === 0 ? 'text-rose-600' : 'text-blue-600'}`}>{p.stock}</p>
              </div>
            </div>
          </div>
        ))}
        {filteredParts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold italic">Aucune pièce de rechange trouvée.</p>
          </div>
        )}
      </div>

      {showAddModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingPart ? 'Modifier' : 'Nouvelle'} Pièce</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 p-2 hover:bg-white rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produit Parent</label>
                <select required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={formData.productId} onChange={(e) => setFormData({...formData, productId: e.target.value})}>
                  <option value="">Sélectionner le produit lié...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation de la pièce</label>
                <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase ml-1">Référence / SKU</label><input type="text" className="w-full px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-black" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Stock Initial</label><input type="number" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})} /></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prix d'Achat (DH)</label>
                <input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex flex-col gap-3">
              <button type="submit" className="btn-primary w-full py-4 text-sm">Enregistrer la pièce</button>
            </div>
          </form>
        </div>
      )}

      <AlertDialog open={!!partToDelete} onOpenChange={() => setPartToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="w-8 h-8 text-rose-600" /></div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Supprimer cette pièce ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-lg">Cette action est irréversible. La pièce sera retirée définitivement du stock de maintenance.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(partToDelete) { onDeletePart(partToDelete); setPartToDelete(null); } }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black">Confirmer Suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpareParts;
