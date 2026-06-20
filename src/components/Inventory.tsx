'use client';
import React, { useState, useMemo } from 'react';
import { Product, StockStatus } from '@/lib/types';
import { exportToCsv } from '@/lib/utils';
import { CsvImportButton } from './CsvImportButton';
import { Download, Trash2, Edit3, Package, Search, Lock, AlertTriangle, X } from 'lucide-react';
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

interface InventoryProps {
  products: Product[];
  onUpdateStock: (id: string, newStock: number) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (id: string, product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  isReadOnly?: boolean;
}

type SortField = 'name' | 'sku' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

const Inventory: React.FC<InventoryProps> = ({ 
  products, onUpdateStock, onAddProduct, onEditProduct, onDeleteProduct, isReadOnly = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({ field: 'name', direction: 'asc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editPriceTTC, setEditPriceTTC] = useState(0);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: '' });

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);

  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    result.sort((a, b) => {
      const field = sortConfig.field;
      let valA = a[field]; let valB = b[field];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [products, searchTerm, selectedCategory, sortConfig]);

  const handleSort = (field: SortField) => setSortConfig(prev => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const getStatus = (p: Product) => {
    if (p.stock === 0) return StockStatus.OUT_OF_STOCK;
    if (p.stock <= p.minStock) return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  };

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case StockStatus.IN_STOCK: return 'bg-emerald-100 text-emerald-700';
      case StockStatus.LOW_STOCK: return 'bg-amber-100 text-amber-700';
      case StockStatus.OUT_OF_STOCK: return 'bg-rose-100 text-rose-700';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inventaire</h2>
          <p className="text-sm text-slate-500 mt-1">Catalogue complet de vos références.</p>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => exportToCsv('inventaire.csv', processedProducts)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2">
              <Download className="w-4 h-4" />Exporter CSV
            </button>
            {!isReadOnly && (
              <CsvImportButton
                tableName="products"
                schemaKeys={['name', 'sku', 'category', 'price', 'stock', 'minStock', 'declassedStock']}
                idPrefix="prd"
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
              />
            )}
            {!isReadOnly && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                Nouveau Produit
              </button>
            )}
            {isReadOnly && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-400 font-bold uppercase text-[10px] tracking-widest border border-slate-200">
                <Lock className="w-3 h-3" /> Consultation
              </div>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 p-4 rounded-[2.5rem] border border-white/80 shadow-sm backdrop-blur-sm">
        <div className="md:col-span-2 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Recherche par nom, marque..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="w-full px-4 py-3 bg-white font-bold border border-slate-100 rounded-2xl outline-none text-slate-700 text-sm appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 transition-all" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="all">Toutes Catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button onClick={() => handleSort('stock')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortConfig.field === 'stock' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Trier Stock</button>
           <button onClick={() => handleSort('price')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sortConfig.field === 'price' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Trier Prix</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processedProducts.map((p) => (
          <div key={p.id} className="bento-card p-6 flex flex-col group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><Package className="w-6 h-6 text-blue-600" /></div>
              {!isReadOnly && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditingProduct(p); setEditPriceTTC(Number((p.price * 1.20).toFixed(2))); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 className="w-5 h-5" /></button>
                  <button onClick={() => setProductToDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{p.category}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-500 uppercase">{p.sku}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-1 leading-tight">{p.name}</h3>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prix d'Achat TTC</p>
                <p className="text-xl font-black text-slate-900 mt-1">{(p.price * 1.20).toLocaleString()} <span className="text-xs">DH</span></p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(getStatus(p))}`}>{getStatus(p)}</span>
                
                {/* Stock Neuf */}
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 w-full justify-between">
                  <span className="text-[8px] font-black text-slate-400 uppercase pl-2">Stock Neuf</span>
                  <input 
                    type="number" 
                    readOnly={isReadOnly}
                    className={`w-12 px-1 py-1 bg-white border-none text-center font-black text-slate-800 text-xs shadow-sm ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    value={p.stock} 
                    onChange={(e) => onUpdateStock(p.id, parseInt(e.target.value) || 0)} 
                  />
                </div>

                {/* Stock Déclassé */}
                <div className="flex items-center gap-2 bg-rose-50/50 p-1 rounded-xl border border-rose-100 w-full justify-between">
                  <div className="flex items-center gap-1 pl-2">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                    <span className="text-[8px] font-black text-rose-600 uppercase">Déclassé</span>
                  </div>
                  <span className="w-12 px-1 py-1 bg-white rounded-lg text-center font-black text-rose-600 text-xs shadow-sm">
                    {p.declassedStock || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onAddProduct({ ...newProduct, price: 0, stock: 0, minStock: 5, declassedStock: 0 }); setShowAddModal(false); }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Nouveau Produit</h3><button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 p-2 hover:bg-white rounded-full transition-all"><X className="w-6 h-6" /></button></div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation du produit</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Marque</label><input type="text" required className="w-full px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-black text-blue-700" placeholder="ex: Samsung, Apple..." value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} /></div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex flex-col gap-3"><button type="submit" className="btn-primary w-full py-4 text-sm">Enregistrer le produit</button><button type="button" onClick={() => setShowAddModal(false)} className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Annuler</button></div>
          </form>
        </div>
      )}

      {editingProduct && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onEditProduct(editingProduct.id, { ...editingProduct, price: editPriceTTC / 1.20 }); setEditingProduct(null); }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-800 tracking-tight">Modifier Produit</h3><button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 p-2 hover:bg-white rounded-full transition-all"><X className="w-6 h-6" /></button></div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Désignation</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Prix d'Achat TTC (DH)</label><input type="number" step="0.01" required className="w-full px-5 py-4 bg-blue-50 border border-blue-200 text-2xl font-black text-blue-700 text-center rounded-2xl outline-none" value={editPriceTTC} onChange={(e) => setEditPriceTTC(parseFloat(e.target.value) || 0)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marque</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={editingProduct.sku} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seuil Alerte</label><input type="number" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={editingProduct.minStock} onChange={(e) => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value) || 0})} /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} /></div>
            </div>
            <div className="p-8 bg-slate-50 flex flex-col gap-3"><button type="submit" className="btn-primary w-full py-4 text-sm">Mettre à jour</button><button type="button" onClick={() => setEditingProduct(null)} className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Annuler</button></div>
          </form>
        </div>
      )}

      {/* ALERT DIALOG POUR SUPPRESSION */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8">
          <AlertDialogHeader>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="w-8 h-8 text-rose-600" /></div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-lg">Cette action est irréversible. Le produit sera retiré définitivement du catalogue et de vos stocks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(productToDelete) { onDeleteProduct(productToDelete); setProductToDelete(null); } }} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Confirmer la suppression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;