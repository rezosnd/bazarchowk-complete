"use client";

import React, { useState, useEffect } from 'react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
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

  const openNewModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIconUrl('');
    setImageUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIconUrl(cat.iconUrl || '');
    setImageUrl(cat.imageUrl || '');
    setIsActive(cat.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      description: description || undefined,
      iconUrl: iconUrl || undefined,
      imageUrl: imageUrl || undefined,
      isActive,
    };

    const token = localStorage.getItem('admin_token');
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    try {
      if (editingCategory) {
        // PATCH update
        await fetch(`${API_BASE}/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        // POST create
        await fetch(`${API_BASE}/categories`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      alert('Failed to save category. Make sure you are logged in as ADMIN.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to completely delete this category? This will cascade delete all its products and subcategories.')) return;
    
    const token = localStorage.getItem('admin_token');
    const headers = {
      'Authorization': `Bearer ${token}` 
    };

    try {
      await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
        headers,
      });
      fetchCategories();
    } catch (error) {
      alert('Failed to delete category.');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Category Taxonomy</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global categories and subcategories used across the entire platform.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-green-600/20 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Master Category
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Category Name</th>
                <th scope="col" className="px-6 py-4 font-semibold">Description</th>
                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold">Subcategories</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading taxonomy...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No categories found. Start by creating one.</td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{cat.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{cat.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                    {cat.description || <span className="italic text-gray-400">No description</span>}
                  </td>
                  <td className="px-6 py-4">
                    {cat.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{cat.subCategories?.length || 0}</span>
                      <span className="text-xs text-gray-500">nodes</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => openEditModal(cat)}
                      className="text-blue-600 hover:text-blue-900 mr-4 font-semibold"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-600 hover:text-red-900 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-6" id="modal-title">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category Name *</label>
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="e.g., Groceries" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-green-500 focus:border-green-500 sm:text-sm" rows={3} placeholder="Brief description of the category..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Image URL</label>
                      <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="https://example.com/image.png" />
                    </div>
                    <div className="flex items-center pt-2">
                      <input id="isActive" type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 font-medium">Category is Active and visible to customers</label>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                  <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                    {saving ? 'Saving...' : 'Save Category'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
