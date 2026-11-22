'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatINR } from '@/lib/shared/format';
import { PRODUCT_SECTIONS } from '@/lib/shared/types';
import type { AdminProduct, Category, ProductSection } from '@/lib/shared/types';
import { Badge, Button, Card, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea, Toggle } from './ui';
import { useAdmin } from './AdminApp';

type Form = {
  id?: string;
  name: string;
  sku: string;
  categoryId: string | null;
  section: ProductSection;
  sellingPrice: number | '';
  mrp: number | '';
  costPrice: number | '';
  stock: number | '';
  images: string[];
  description: string;
  spiritualBenefits: string[];
  tags: string[];
  weightKg: number | '';
  dimensions: { lengthCm: number | ''; breadthCm: number | ''; heightCm: number | '' };
  isBestseller: boolean;
  isActive: boolean;
  hsnCode: string;
  gstRate: number;
};

const blank = (categoryId: string | null): Form => ({
  name: '', sku: '', categoryId, section: 'EXPLORE', sellingPrice: '', mrp: '', costPrice: '', stock: 0, images: [],
  description: '', spiritualBenefits: [], tags: [], weightKg: 0.5, dimensions: { lengthCm: 15, breadthCm: 12, heightCm: 10 },
  isBestseller: false, isActive: true, hsnCode: '', gstRate: 0
});

/** Resize + compress in the browser before upload (max 1200px, JPEG ~0.8). */
async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('This file could not be read as an image.'));
      i.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not supported in this browser.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression failed.'))), 'image/jpeg', 0.8)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function TabProducts() {
  const { showToast } = useToast();
  const { can } = useAdmin();
  const canCreate = can('products.create');
  const canEdit = can('products.edit');
  const canDelete = can('products.delete');
  const canStock = can('products.stock');
  const canCategories = can('categories.manage');
  const seeCost = can('products.cost');
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [benefit, setBenefit] = useState('');
  const [filter, setFilter] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, c] = await Promise.all([
        adminFetch<{ products: AdminProduct[] }>('/api/admin/products'),
        adminFetch<{ categories: Category[] }>('/api/admin/categories')
      ]);
      setProducts(p.products);
      setCategories(c.categories);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const edit = (p: AdminProduct) =>
    setForm({
      id: p.id, name: p.name, sku: p.sku, categoryId: p.categoryId, section: p.section, sellingPrice: p.sellingPrice, mrp: p.mrp,
      costPrice: p.costPrice, stock: p.stock, images: p.images, description: p.description, spiritualBenefits: p.spiritualBenefits,
      tags: p.tags, weightKg: p.weightKg, dimensions: p.dimensions, isBestseller: p.isBestseller, isActive: p.isActive,
      hsnCode: p.hsnCode, gstRate: p.gstRate
    });

  const upload = async (file: File) => {
    if (!form) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      const { url } = await adminFetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd });
      setForm((f) => (f ? { ...f, images: [...f.images, url] } : f));
      showToast('Photo uploaded', `${Math.round(blob.size / 1024)} KB`);
    } catch (err) {
      showToast('Upload failed', errorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const { id, ...body } = form;
    try {
      if (id) await adminFetch(`/api/admin/products/${id}`, { method: 'PUT', json: body });
      else await adminFetch('/api/admin/products', { method: 'POST', json: body });
      showToast('Product saved', form.name);
      setForm(null);
      load();
    } catch (err) {
      showToast('Could not save product', errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}"? Products that already have orders are archived (hidden) instead, so order history stays intact.`)) return;
    try {
      const res = await adminFetch<{ archived: boolean }>(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      showToast(res.archived ? 'Product archived' : 'Product deleted', p.name, 'info');
      load();
    } catch (err) {
      showToast('Delete failed', errorMessage(err), 'error');
    }
  };

  const quickStock = async (p: AdminProduct, stock: number) => {
    try {
      const id = p.id;
      await adminFetch(`/api/admin/products/${id}/stock`, { method: 'PATCH', json: { stock } });
      setProducts((list) => list?.map((x) => (x.id === id ? { ...x, stock } : x)) || null);
    } catch (err) {
      showToast('Stock update failed', errorMessage(err), 'error');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!products) return <Spinner />;

  const shown = products.filter((p) => !filter || `${p.name} ${p.sku}`.toLowerCase().includes(filter.toLowerCase()));
  const f = form;
  const setF = (patch: Partial<Form>) => setForm((x) => (x ? { ...x, ...patch } : x));

  return (
    <div className="space-y-6">
      <Card
        title={`Products (${products.length})`}
        subtitle="Prices and stock are enforced on the server at checkout."
        actions={
          <>
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name or SKU" className="w-48" />
            {canCategories && <Button variant="ghost" onClick={() => setShowCategories(true)}>Categories</Button>}
            {canCreate && <Button onClick={() => setForm(blank(categories[0]?.id ?? null))}><Plus className="w-4 h-4" /> Add product</Button>}
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-espresso">
            <thead className="bg-parchment-100 text-maroon-700 text-[10px] uppercase">
              <tr>
                <th className="p-2 text-left">Product</th><th className="p-2 text-left">Category</th><th className="p-2 text-left">Price / MRP</th>
                {seeCost && <th className="p-2 text-left">Cost</th>}<th className="p-2 text-left">Stock</th><th className="p-2 text-left">Status</th><th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((p) => (
                <tr key={p.id} className={p.isActive ? '' : 'opacity-60'}>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.images[0] ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border" /> : <div className="w-10 h-10 rounded-lg bg-stone-100" />}
                      <div>
                        <p className="font-bold max-w-xs truncate">{p.name}</p>
                        <p className="font-mono text-[10px] text-stone-500">{p.sku}{p.isBestseller ? ' • Bestseller' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">{p.category}</td>
                  <td className="p-2">{formatINR(p.sellingPrice)} <span className="text-stone-400 line-through">{formatINR(p.mrp)}</span></td>
                  {seeCost && <td className="p-2">{formatINR(p.costPrice)}</td>}
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      disabled={!canStock}
                      onBlur={(e) => {
                        const v = Math.max(0, Math.floor(Number(e.target.value)));
                        if (v !== p.stock) quickStock(p, v);
                      }}
                      className={`w-20 border rounded-lg px-2 py-1 ${p.stock <= 5 ? 'border-rose-400 text-rose-700 font-bold' : 'border-stone-300'}`}
                      aria-label={`Stock for ${p.name}`}
                    />
                  </td>
                  <td className="p-2">{p.isActive ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Live</Badge> : <Badge className="bg-stone-100 text-stone-500 border-stone-200">Hidden</Badge>}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    {canEdit && <button onClick={() => edit(p)} className="p-1.5 text-maroon-700" aria-label="Edit"><Edit2 className="w-4 h-4" /></button>}
                    {canDelete && <button onClick={() => remove(p)} className="p-1.5 text-rose-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="text-center text-xs text-stone-500 py-8">No products found.</p>}
        </div>
      </Card>

      {f && (
        <Modal title={f.id ? `Edit: ${f.name}` : 'Add product'} onClose={() => setForm(null)} wide>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Product name *" className="sm:col-span-3"><Input required value={f.name} onChange={(e) => setF({ name: e.target.value })} /></Field>
              <Field label="SKU *"><Input required value={f.sku} onChange={(e) => setF({ sku: e.target.value.toUpperCase() })} placeholder="RPS-DD-01" /></Field>
              <Field label="Category">
                <Select value={f.categoryId || ''} onChange={(e) => setF({ categoryId: e.target.value || null })}>
                  <option value="">— none —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Homepage section">
                <Select value={f.section} onChange={(e) => setF({ section: e.target.value as ProductSection })}>
                  {PRODUCT_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Selling price ₹ *"><Input required type="number" min={1} value={f.sellingPrice} onChange={(e) => setF({ sellingPrice: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
              <Field label="MRP ₹ *"><Input required type="number" min={1} value={f.mrp} onChange={(e) => setF({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
              {seeCost && <Field label="Cost price ₹ (private)" hint="Used for profit reports"><Input type="number" min={0} value={f.costPrice} onChange={(e) => setF({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>}
              <Field label="Stock *" hint={canStock ? undefined : 'Your role cannot change stock'}><Input required type="number" min={0} disabled={!canStock} value={f.stock} onChange={(e) => setF({ stock: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
              <Field label="GST rate %">
                <Select value={f.gstRate} onChange={(e) => setF({ gstRate: Number(e.target.value) })}>
                  {[0, 3, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                </Select>
              </Field>
              <Field label="HSN code"><Input value={f.hsnCode} onChange={(e) => setF({ hsnCode: e.target.value.replace(/\D/g, '') })} /></Field>
              <Field label="Packed weight kg *" hint="Used for courier booking"><Input required type="number" step="0.01" min={0.01} value={f.weightKg} onChange={(e) => setF({ weightKg: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
              <Field label="Box L × B × H cm *">
                <div className="flex gap-1">
                  {(['lengthCm', 'breadthCm', 'heightCm'] as const).map((k) => (
                    <Input key={k} required type="number" min={1} value={f.dimensions[k]} onChange={(e) => setF({ dimensions: { ...f.dimensions, [k]: e.target.value === '' ? '' : Number(e.target.value) } })} />
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => setF({ description: e.target.value })} /></Field>

            <div>
              <p className="text-xs font-semibold text-stone-700 mb-1">Photos (first photo is the main image)</p>
              <div className="flex flex-wrap gap-2 items-center">
                {f.images.map((src, i) => (
                  <div key={src + i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl border" />
                    <button type="button" onClick={() => setF({ images: f.images.filter((_, j) => j !== i) })} className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5" aria-label="Remove photo">
                      <X className="w-3 h-3" />
                    </button>
                    {i > 0 && (
                      <button type="button" onClick={() => setF({ images: [src, ...f.images.filter((_, j) => j !== i)] })} className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] rounded-b-xl">
                        Make main
                      </button>
                    )}
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-[10px] text-stone-500 cursor-pointer hover:border-maroon-700">
                  <ImagePlus className="w-5 h-5" />
                  {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) upload(file);
                    }} />
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…or paste an https:// image URL" />
                <Button type="button" variant="ghost" onClick={() => {
                  if (/^https:\/\//.test(imageUrl.trim())) {
                    setF({ images: [...f.images, imageUrl.trim()] });
                    setImageUrl('');
                  } else showToast('Invalid URL', 'Image URLs must start with https://', 'warn');
                }}>Add URL</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-700 mb-1">Highlights / benefits</p>
              <ul className="space-y-1 mb-2">
                {f.spiritualBenefits.map((b, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-white border rounded-lg px-2 py-1">
                    {b}
                    <button type="button" onClick={() => setF({ spiritualBenefits: f.spiritualBenefits.filter((_, j) => j !== i) })} className="text-rose-600"><X className="w-3 h-3" /></button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="e.g. Solid heavy-gauge brass" />
                <Button type="button" variant="ghost" onClick={() => {
                  if (benefit.trim()) {
                    setF({ spiritualBenefits: [...f.spiritualBenefits, benefit.trim()] });
                    setBenefit('');
                  }
                }}>Add</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-5">
              <Toggle checked={f.isActive} onChange={(v) => setF({ isActive: v })} label="Visible on store" />
              <Toggle checked={f.isBestseller} onChange={(v) => setF({ isBestseller: v })} label="Feature as bestseller" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{f.id ? 'Save changes' : 'Create product'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {showCategories && <CategoryManager categories={categories} onClose={() => setShowCategories(false)} onChanged={load} />}
    </div>
  );
}

function CategoryManager({ categories, onClose, onChanged }: { categories: Category[]; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const body = {
      name: editing.name || '',
      slug: editing.slug || (editing.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      image: editing.image || '',
      description: editing.description || '',
      sortOrder: editing.sortOrder || 0,
      isActive: editing.isActive ?? true
    };
    try {
      if (editing.id) await adminFetch(`/api/admin/categories/${editing.id}`, { method: 'PUT', json: body });
      else await adminFetch('/api/admin/categories', { method: 'POST', json: body });
      setEditing(null);
      onChanged();
    } catch (err) {
      showToast('Could not save category', errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Its products become uncategorised.`)) return;
    try {
      await adminFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      showToast('Delete failed', errorMessage(err), 'error');
    }
  };

  return (
    <Modal title="Categories" onClose={onClose}>
      <ul className="divide-y divide-stone-200 mb-4">
        {categories.map((c) => (
          <li key={c.id} className="py-2 flex items-center justify-between text-xs">
            <span><strong>{c.name}</strong> <span className="text-stone-400">/{c.slug}</span> {!c.isActive && <span className="text-stone-400">(hidden)</span>}</span>
            <span>
              <button onClick={() => setEditing(c)} className="p-1 text-maroon-700"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => remove(c)} className="p-1 text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </span>
          </li>
        ))}
      </ul>
      {editing ? (
        <form onSubmit={save} className="space-y-3 bg-white p-3 rounded-2xl border">
          <Field label="Name *"><Input required value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Slug" hint="Leave empty to generate from the name"><Input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
          <Field label="Image URL"><Input value={editing.image || ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></Field>
          <Field label="Description"><Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
          <Field label="Sort order"><Input type="number" value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></Field>
          <Toggle checked={editing.isActive ?? true} onChange={(v) => setEditing({ ...editing, isActive: v })} label="Visible" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setEditing({ isActive: true, sortOrder: categories.length })}><Plus className="w-4 h-4" /> New category</Button>
      )}
    </Modal>
  );
}
