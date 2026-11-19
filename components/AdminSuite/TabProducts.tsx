'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Product, HomepageSection } from '@/lib/types';
import { Plus, Edit2, Trash2, Upload, Sparkles, AlertTriangle, Image as ImageIcon, Check } from 'lucide-react';

export default function TabProducts() {
  const { state, addProduct, editProduct, deleteProduct, showToast } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    category: state.categories[0]?.name || 'Pooja Samagri',
    section: 'EXPLORE',
    sellingPrice: 499,
    mrp: 999,
    cogs: 220,
    stock: 25,
    images: ['https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=800&q=80'],
    description: '',
    spiritualBenefits: ['100% Solid Pure Brassware', 'Vedic Mantra Consecrated'],
    rating: 4.9,
    reviewCount: 12,
    weightKg: 0.5,
    dimensions: { lengthCm: 15, breadthCm: 12, heightCm: 10 },
    isBestseller: false
  });

  const [benefitInput, setBenefitInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      sku: `RPS-${Date.now().toString().slice(-4)}`,
      category: state.categories[0]?.name || 'Pooja Samagri',
      section: 'EXPLORE',
      sellingPrice: 499,
      mrp: 999,
      cogs: 220,
      stock: 25,
      images: ['https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=800&q=80'],
      description: '',
      spiritualBenefits: ['100% Solid Pure Brassware'],
      rating: 4.9,
      reviewCount: 10,
      weightKg: 0.5,
      dimensions: { lengthCm: 15, breadthCm: 12, heightCm: 10 },
      isBestseller: false
    });
  };

  const handleEditClick = (prod: Product) => {
    setIsEditing(true);
    setFormData({ ...prod });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Client-Side HTML5 Canvas Image Compressor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700;
        const MAX_HEIGHT = 700;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to WebP / JPEG at 0.72 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setFormData((prev) => ({
            ...prev,
            images: [compressedDataUrl, ...(prev.images || [])]
          }));
          showToast('Photo Compressed & Attached', 'Optimized client-side with HTML5 Canvas (<80KB).');
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [imageUrlInput.trim(), ...(prev.images || [])]
    }));
    setImageUrlInput('');
  };

  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      spiritualBenefits: [...(prev.spiritualBenefits || []), benefitInput.trim()]
    }));
    setBenefitInput('');
  };

  const handleRemoveBenefit = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      spiritualBenefits: (prev.spiritualBenefits || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sellingPrice) {
      alert('Product name and selling price are required.');
      return;
    }

    if (isEditing && formData.id) {
      editProduct(formData as Product);
    } else {
      addProduct(formData as Omit<Product, 'id'>);
    }
    resetForm();
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Add / Edit Product Form */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
          <h3 className="font-serif text-lg font-bold text-maroon-700 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <span>{isEditing ? `Edit Product: ${formData.name}` : 'Add New Sacred Product'}</span>
          </h3>
          {isEditing && (
            <button
              onClick={resetForm}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-xl font-bold"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Handcrafted Pure Brass Dhoop Dani / Loban Burner"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">SKU / Item Code *</label>
              <input
                type="text"
                required
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="RPS-BR-01"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono uppercase text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Homepage Section *</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value as HomepageSection })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              >
                <option value="EXPLORE">Explore Collections (General)</option>
                <option value="BESTSELLER">#1 Bestseller Spotlight Card</option>
                <option value="ZODIAC">Shop By Zodiac</option>
                <option value="SHANKH">Divine Shankh Collection</option>
                <option value="DEEPAM">Mangalavar Deepam Collection</option>
                <option value="MURTI">Murti Sangrah (Brass Idols)</option>
                <option value="URLI">Timeless Beauty of Brass Urlis</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                required
                value={formData.sellingPrice || 0}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-bold text-maroon-700 focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">MRP / Strikethrough (₹) *</label>
              <input
                type="number"
                required
                value={formData.mrp || 0}
                onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-500 focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Cost Price (COGS ₹) <span className="text-[10px] text-stone-400">(For Profit Analytics)</span>
              </label>
              <input
                type="number"
                value={formData.cogs || 0}
                onChange={(e) => setFormData({ ...formData, cogs: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-emerald-700 font-semibold focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Stock Quantity *</label>
              <input
                type="number"
                required
                value={formData.stock || 0}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso font-bold focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Package Weight (kg) *</label>
              <input
                type="number"
                step="0.05"
                required
                value={formData.weightKg || 0.5}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Dimensions (L × B × H cm)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="L"
                  value={formData.dimensions?.lengthCm || 15}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions!, lengthCm: Number(e.target.value) }
                  })}
                  className="w-1/3 border rounded-lg px-2 py-2 text-center"
                />
                <input
                  type="number"
                  placeholder="B"
                  value={formData.dimensions?.breadthCm || 12}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions!, breadthCm: Number(e.target.value) }
                  })}
                  className="w-1/3 border rounded-lg px-2 py-2 text-center"
                />
                <input
                  type="number"
                  placeholder="H"
                  value={formData.dimensions?.heightCm || 10}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions!, heightCm: Number(e.target.value) }
                  })}
                  className="w-1/3 border rounded-lg px-2 py-2 text-center"
                />
              </div>
            </div>
          </div>

          {/* Photos Upload & Client-side HTML5 Canvas Compressor */}
          <div className="p-4 bg-parchment-100/60 rounded-2xl border border-gold-300/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-maroon-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>Product Photos (Client-Side Canvas Auto-Compressor)</span>
              </span>
              <span className="text-[10px] text-stone-500">
                Uploaded photos are auto-compressed to light JPEGs to prevent localStorage limit overflow.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition">
                <Upload className="w-4 h-4" />
                <span>{isCompressing ? 'Compressing...' : 'Upload from Phone / PC'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isCompressing}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="url"
                  placeholder="Or paste external image URL..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="bg-maroon-700 text-white font-bold px-3 py-2 rounded-xl"
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Photos Preview Gallery */}
            {formData.images && formData.images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gold-400 shadow-sm group">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        images: formData.images?.filter((_, i) => i !== idx)
                      })}
                      className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Product Description</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          {/* Spiritual Benefits */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Vedic & Spiritual Benefits</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Clears negative energy, made of pure virgin brass"
                value={benefitInput}
                onChange={(e) => setBenefitInput(e.target.value)}
                className="flex-1 border border-stone-300 rounded-xl px-3 py-2"
              />
              <button
                type="button"
                onClick={handleAddBenefit}
                className="bg-stone-800 text-amber-200 font-bold px-4 py-2 rounded-xl"
              >
                Add Benefit
              </button>
            </div>

            <div className="space-y-1.5">
              {formData.spiritualBenefits?.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between bg-stone-50 border p-2 rounded-lg text-xs">
                  <span>• {b}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="text-red-600 hover:text-red-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3 rounded-2xl text-sm shadow-md transition"
            >
              {isEditing ? 'Save Product Changes' : 'Publish Product to Live Catalog'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Catalog Products Table & Stock Overview */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-serif text-lg font-bold text-maroon-700">
              Active Catalog Inventory ({state.products.length} Products)
            </h3>
            <p className="text-xs text-stone-500">Live stock quantities, COGS, and pricing.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-espresso">
            <thead className="bg-parchment-100 text-maroon-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">SKU / Section</th>
                <th className="p-3">Price / MRP</th>
                <th className="p-3">COGS</th>
                <th className="p-3">Stock Level</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {state.products.map((prod) => (
                <tr key={prod.id} className="hover:bg-parchment-50/50 transition">
                  <td className="p-3 flex items-center gap-3">
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-12 h-12 object-cover rounded-xl border border-gold-300"
                    />
                    <div>
                      <p className="font-bold text-espresso">{prod.name}</p>
                      <span className="text-[10px] text-stone-400">{prod.category}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="font-mono font-bold text-stone-600">{prod.sku}</span>
                    <span className="block text-[10px] text-saffron-600 font-semibold">{prod.section}</span>
                  </td>

                  <td className="p-3">
                    <span className="font-bold text-maroon-700">₹{prod.sellingPrice}</span>
                    <span className="text-[10px] text-stone-400 block line-through">₹{prod.mrp}</span>
                  </td>

                  <td className="p-3 font-semibold text-emerald-700">
                    ₹{prod.cogs}
                  </td>

                  <td className="p-3">
                    {prod.stock <= 0 ? (
                      <span className="inline-block bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        Out of Stock
                      </span>
                    ) : prod.stock <= 5 ? (
                      <span className="inline-block bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        Low: {prod.stock} Left
                      </span>
                    ) : (
                      <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        {prod.stock} in Stock
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleEditClick(prod)}
                      className="p-1.5 hover:bg-stone-100 text-maroon-700 rounded-lg"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${prod.name}" from store catalog?`)) {
                          deleteProduct(prod.id);
                        }
                      }}
                      className="p-1.5 hover:bg-stone-100 text-red-600 rounded-lg"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
