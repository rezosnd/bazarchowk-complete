"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, 
  Image as ImageIcon, Layers, AlertCircle, CheckCircle2,
  FolderTree, Loader2
} from 'lucide-react';

// Production interfaces matching the NestJS Backend exactly
interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  subCategories: SubCategory[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'CATEGORY' | 'SUBCATEGORY'>('CATEGORY');
  
  // Editing State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI State
  const [renderError, setRenderError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      fetchCategories();
    } catch (e: any) {
      setRenderError(e.message || 'Unknown error during fetch init');
    }
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  // Category Modal Actions
  const openNewCategoryModal = () => {
    setModalType('CATEGORY');
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIconUrl('');
    setImageUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setModalType('CATEGORY');
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIconUrl(cat.iconUrl || '');
    setImageUrl(cat.imageUrl || '');
    setIsActive(cat.isActive);
    setIsModalOpen(true);
  };

  // SubCategory Modal Actions
  const openNewSubCategoryModal = (categoryId: string) => {
    setModalType('SUBCATEGORY');
    setEditingSubCategory(null);
    setSelectedCategoryId(categoryId);
    setName('');
    setDescription('');
    setIconUrl('');
    setImageUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditSubCategoryModal = (sub: SubCategory) => {
    setModalType('SUBCATEGORY');
    setEditingSubCategory(sub);
    setSelectedCategoryId(sub.categoryId);
    setName(sub.name);
    setDescription(sub.description || '');
    setIconUrl(sub.iconUrl || '');
    setImageUrl(sub.imageUrl || '');
    setIsActive(sub.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: any = {
      name,
      description: description || undefined,
      iconUrl: iconUrl || undefined,
      imageUrl: imageUrl || undefined,
      isActive,
    };

    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Authentication required. Please log in.');
      setSaving(false);
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    try {
      let res;
      if (modalType === 'CATEGORY') {
        if (editingCategory) {
          res = await fetch(`${API_BASE}/categories/${editingCategory.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
        }
      } else {
        payload.categoryId = selectedCategoryId;
        if (editingSubCategory) {
          res = await fetch(`${API_BASE}/categories/sub/${editingSubCategory.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`${API_BASE}/categories/sub`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
        }
      }
      
      if (!res.ok) {
        const errData = await res.text();
        throw new Error(`Backend Error: ${errData}`);
      }

      setIsModalOpen(false);
      fetchCategories();
      
      if (modalType === 'SUBCATEGORY' && !editingSubCategory && selectedCategoryId) {
         setExpandedCategories(prev => new Set(prev).add(selectedCategoryId));
      }
    } catch (error: any) {
      alert(`Failed to save.\n\nReason: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to completely delete this category? This will cascade delete all its products and subcategories.')) return;
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCategories();
    } catch (error) {
      alert('Failed to delete category.');
    }
  };

  const handleDeleteSubCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`${API_BASE}/categories/sub/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCategories();
    } catch (error) {
      alert('Failed to delete subcategory.');
    }
  };

  if (renderError) {
    return (
      <div className="p-8 bg-red-50 text-red-900 min-h-screen font-mono flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-100">
          <div className="flex items-center gap-4 text-red-600 mb-6">
            <AlertCircle className="w-10 h-10" />
            <h1 className="text-2xl font-bold">React Runtime Crash Detected</h1>
          </div>
          <p className="bg-red-50 p-4 rounded-xl border border-red-100 font-mono text-sm">{renderError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-indigo-600" />
            Category Management
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Build and manage the master taxonomy, subcategories, and structure.</p>
        </div>
        <button 
          onClick={openNewCategoryModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Master Category
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider w-12"></th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">SubNodes</th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <span className="font-medium">Loading taxonomy structure...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <FolderTree className="w-8 h-8 text-slate-400" />
                      </div>
                      <span className="font-medium text-lg">No categories found</span>
                      <p className="text-sm">Start by creating your first master category above.</p>
                    </div>
                  </td>
                </tr>
              ) : categories.map((cat) => (
                <React.Fragment key={cat.id}>
                  {/* Master Category Row */}
                  <tr className={`bg-white transition-all hover:bg-indigo-50/30 ${expandedCategories.has(cat.id) ? 'bg-indigo-50/10' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button 
                        onClick={() => toggleExpand(cat.id)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center
                          ${cat.subCategories?.length > 0 
                            ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' 
                            : 'bg-slate-100 text-slate-400 cursor-default'}`}
                        disabled={cat.subCategories?.length === 0}
                      >
                        {expandedCategories.has(cat.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-base">{cat.name}</div>
                          {cat.description && (
                            <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">{cat.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {cat.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/50 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 shadow-inner">
                        <Layers className="w-4 h-4 mr-1.5 text-indigo-500" />
                        {cat.subCategories?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openNewSubCategoryModal(cat.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                          title="Add Subcategory"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openEditCategoryModal(cat)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                          title="Edit Category"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Delete Category"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded SubCategories Area */}
                  {expandedCategories.has(cat.id) && (
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <td colSpan={5} className="px-0 py-0">
                        <div className="pl-24 pr-8 py-6 bg-gradient-to-r from-transparent to-slate-50/80 shadow-inner">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                              <Layers className="w-4 h-4" />
                              Subcategories for {cat.name}
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {cat.subCategories?.map(sub => (
                              <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                                {sub.imageUrl ? (
                                  <img src={sub.imageUrl} alt={sub.name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 bg-slate-50 shrink-0" />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-6 h-6 text-indigo-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <h5 className="font-bold text-slate-900 truncate">{sub.name}</h5>
                                    {sub.isActive ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" title="Disabled"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sub.description || 'No description'}</p>
                                  
                                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditSubCategoryModal(sub)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                      <Edit2 className="w-3 h-3" /> Edit
                                    </button>
                                    <button onClick={() => handleDeleteSubCategory(sub.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1">
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {cat.subCategories?.length === 0 && (
                              <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                                <p className="text-sm text-slate-500 mb-3">No subcategories created yet.</p>
                                <button 
                                  onClick={() => openNewSubCategoryModal(cat.id)}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm inline-flex items-center gap-1"
                                >
                                  <Plus className="w-4 h-4" /> Add the first subcategory
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg transform transition-all overflow-hidden border border-slate-200">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
              <div className="px-8 pt-8 pb-6 flex-1 overflow-y-auto">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  {modalType === 'CATEGORY' ? (
                    editingCategory ? 'Edit Master Category' : 'New Master Category'
                  ) : (
                    editingSubCategory ? 'Edit Subcategory' : 'New Subcategory'
                  )}
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-8">
                  {modalType === 'CATEGORY' 
                    ? 'Master categories define the top-level navigation of your app.'
                    : 'Subcategories help group products under a master category.'}
                </p>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white sm:text-sm shadow-inner" 
                      placeholder={modalType === 'CATEGORY' ? "e.g., Electronics" : "e.g., Laptops"} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white sm:text-sm shadow-inner" 
                      rows={3} 
                      placeholder="Brief description for SEO and user context..." 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Image URL</label>
                      <input 
                        type="url" 
                        value={imageUrl} 
                        onChange={e => setImageUrl(e.target.value)} 
                        className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white sm:text-sm shadow-inner" 
                        placeholder="https://..." 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Icon URL (Vector)</label>
                      <input 
                        type="url" 
                        value={iconUrl} 
                        onChange={e => setIconUrl(e.target.value)} 
                        className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50 focus:bg-white sm:text-sm shadow-inner" 
                        placeholder="https://..." 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={isActive} 
                          onChange={e => setIsActive(e.target.checked)} 
                          className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-slate-300 checked:border-indigo-600 checked:bg-indigo-600 transition-all" 
                        />
                        <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">Active & Visible</div>
                        <div className="text-xs text-slate-500 mt-0.5">Toggle visibility on the platform</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full sm:w-auto px-8 py-3 rounded-xl border border-transparent bg-indigo-600 font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

