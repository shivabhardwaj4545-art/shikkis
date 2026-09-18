import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Layers,
  MoveLeft,
  MoveRight,
  Package,
  Save,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  api,
  type AdminVariantItem,
  type CategoryItem,
} from '@/lib/api';
import { formatPrice } from '@/lib/format';

const SIZES_AVAILABLE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE_SIZE'];
const PRESET_COLORS = [
  { name: 'Crimson Red', hex: '#9B1B30', code: 'RED' },
  { name: 'Royal Gold', hex: '#D4AF37', code: 'GLD' },
  { name: 'Midnight Navy', hex: '#1B263B', code: 'NVY' },
  { name: 'Emerald Green', hex: '#2D6A4F', code: 'GRN' },
  { name: 'Ivory White', hex: '#FDFBF7', code: 'IVR' },
  { name: 'Blush Pink', hex: '#E8B4B8', code: 'PNK' },
  { name: 'Mustard Ochre', hex: '#E9C46A', code: 'MST' },
];

export const ProductEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [fabric, setFabric] = useState('');
  const [occasion, setOccasion] = useState('');
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('women');
  const [careInstructions, setCareInstructions] = useState('');
  const [mrpInr, setMrpInr] = useState<number>(4999);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Media
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState<number | null>(null);

  // Variants
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Crimson Red']);
  const [variants, setVariants] = useState<AdminVariantItem[]>([
    { size: 'S', color: 'Crimson Red', variant_sku: 'PRD-RED-S', stock: 10, price_override: null },
    { size: 'M', color: 'Crimson Red', variant_sku: 'PRD-RED-M', stock: 15, price_override: null },
    { size: 'L', color: 'Crimson Red', variant_sku: 'PRD-RED-L', stock: 8, price_override: null },
  ]);

  // Load categories
  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.data);
      if (!categoryId && res.data.length > 0) {
        setCategoryId(res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  // Load existing product if editing
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    api
      .adminGetProductById(id)
      .then((res) => {
        const p = res.product;
        setName(p.name);
        setCategoryId(p.category_id);
        setSku(p.sku);
        setDescription(p.description);
        setLongDescription(p.long_description || '');
        setFabric(p.fabric || '');
        setOccasion(p.occasion || '');
        setGender(p.gender);
        setCareInstructions(p.care_instructions || '');
        setMrpInr(Math.round(p.mrp / 100));
        setDiscountPercent(p.discount_percent);
        setIsActive(p.is_active);
        setIsFeatured(p.is_featured);
        setImages(p.images || []);

        if (res.variants && res.variants.length > 0) {
          setVariants(res.variants);
          const distinctSizes = Array.from(new Set(res.variants.map((v) => v.size)));
          const distinctColors = Array.from(new Set(res.variants.map((v) => v.color)));
          setSelectedSizes(distinctSizes);
          setSelectedColors(distinctColors);
        }
      })
      .catch((err) => {
        console.error('Failed to load product:', err);
        setError('Unable to load product details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Unsaved-changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Image Upload via Multer
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await api.adminUploadImage(file);
        setImages((prev) => [...prev, res.url]);
      }
      markDirty();
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Image upload failed. Please verify image size (< 5MB).');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Reorder Images
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;

    const copy = [...images];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIdx, 0, moved);
    setImages(copy);
    markDirty();
  };

  const setAsPrimaryImage = (index: number) => {
    if (index === 0) return;
    const copy = [...images];
    const [picked] = copy.splice(index, 1);
    copy.unshift(picked);
    setImages(copy);
    markDirty();
  };

  const confirmDeleteImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setDeleteImageTarget(null);
    markDirty();
  };

  // Generate SKU Matrix
  const handleGenerateMatrix = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) {
      alert('Please select at least one size and one color to generate variants.');
      return;
    }

    const baseSku = (sku.trim() || name.replace(/[^A-Z0-9]/gi, '').slice(0, 4) || 'SHK').toUpperCase();
    const generated: AdminVariantItem[] = [];

    for (const color of selectedColors) {
      const colorDef = PRESET_COLORS.find((c) => c.name === color);
      const colorCode = colorDef?.code || color.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'CLR';

      for (const size of selectedSizes) {
        const variantSku = `${baseSku}-${colorCode}-${size}`;
        // Preserve existing stock if matching
        const existing = variants.find((v) => v.size === size && v.color === color);
        generated.push({
          size,
          color,
          variant_sku: variantSku,
          stock: existing?.stock ?? 10,
          price_override: existing?.price_override ?? null,
          is_active: true,
        });
      }
    }

    setVariants(generated);
    markDirty();
  };

  const handleUpdateVariant = (index: number, field: keyof AdminVariantItem, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
    markDirty();
  };

  const handleDeleteVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  // Save Product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      setError('SKU is required.');
      return;
    }
    if (variants.length === 0) {
      setError('At least one product variant is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      category_id: categoryId,
      description: description.trim(),
      long_description: longDescription.trim(),
      fabric: fabric.trim(),
      occasion: occasion.trim(),
      gender,
      care_instructions: careInstructions.trim(),
      mrp: Math.round(mrpInr * 100), // convert to paise
      discount_percent: discountPercent,
      sku: sku.trim().toUpperCase(),
      images,
      is_active: isActive,
      is_featured: isFeatured,
      variants,
    };

    try {
      if (isEditing && id) {
        await api.adminUpdateProduct(id, payload);
      } else {
        await api.adminCreateProduct(payload);
      }

      setIsDirty(false);
      navigate('/admin/products');
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Computed Selling Price for Preview
  const sellingPricePaise = useMemo(() => {
    const mrpPaise = mrpInr * 100;
    return Math.round(mrpPaise * (1 - discountPercent / 100));
  }, [mrpInr, discountPercent]);

  const categoryName = useMemo(() => {
    return categories.find((c) => c.id === categoryId)?.name || 'Ethnic Wear';
  }, [categories, categoryId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
          <p className="text-xs text-text-muted">Loading product editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('Discard unsaved modifications?')) return;
              navigate('/admin/products');
            }}
            className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            title="Back to products"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-text">
              {isEditing ? `Edit: ${name || 'Product'}` : 'Create New Product'}
            </h1>
            <p className="text-xs text-text-muted">
              {isEditing ? `Modifying SKU: ${sku}` : 'Fill in basics, upload imagery, and generate variants'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !window.confirm('Discard unsaved modifications?')) return;
              navigate('/admin/products');
            }}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : isEditing ? 'Update Product' : 'Publish Product'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Layout: Form (Left 7 Cols) + Live Customer Preview (Right 5 Cols) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section 1: Basics */}
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <h2 className="font-serif text-lg font-semibold text-text flex items-center gap-2 border-b border-border pb-3">
              <Package size={17} className="text-brand-crimson" />
              <span>Basic Information</span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-text mb-1">
                Product Title <span className="text-brand-crimson">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. Crimson Vermilion Katan Silk Banarasi Saree"
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Category <span className="text-brand-crimson">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Gender Scope <span className="text-brand-crimson">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value as any);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">
                Master SKU <span className="text-brand-crimson">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase());
                  markDirty();
                }}
                placeholder="e.g. SHK-SAR-01"
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs font-mono text-text focus:outline-hidden focus:border-brand-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Short Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                placeholder="Exquisite handwoven pure katan silk crafted by master artisans in Varanasi."
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Long Story & Provenance</label>
              <textarea
                rows={3}
                value={longDescription}
                onChange={(e) => {
                  setLongDescription(e.target.value);
                  markDirty();
                }}
                placeholder="Detailed craft narrative, weaving technique, and styling notes..."
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
              />
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <h2 className="font-serif text-lg font-semibold text-text flex items-center gap-2 border-b border-border pb-3">
              <span className="font-mono text-brand-gold font-bold">₹</span>
              <span>Pricing & Discounts</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  MRP Price (₹ INR) <span className="text-brand-crimson">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={mrpInr}
                  onChange={(e) => {
                    setMrpInr(Math.max(0, parseInt(e.target.value) || 0));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs font-semibold text-text focus:outline-hidden focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Discount (% OFF)</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={discountPercent}
                  onChange={(e) => {
                    setDiscountPercent(Math.min(90, Math.max(0, parseInt(e.target.value) || 0)));
                    markDirty();
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden focus:border-brand-gold"
                />
              </div>
            </div>

            {/* Computed Price Readout */}
            <div className="p-3 rounded-lg bg-surface-alt/70 border border-border flex items-center justify-between text-xs">
              <span className="text-text-muted">Calculated Customer Selling Price:</span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-lg font-bold text-brand-crimson">
                  {formatPrice(sellingPricePaise)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-[11px] text-text-muted line-through">
                    {formatPrice(mrpInr * 100)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Media Upload (Multer) */}
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-lg font-semibold text-text flex items-center gap-2">
                <ImageIcon size={17} className="text-brand-gold" />
                <span>Product Imagery (Multer Upload)</span>
              </h2>
              <span className="text-[11px] text-text-muted">{images.length} images uploaded</span>
            </div>

            {/* Drag & Drop / File Input Zone */}
            <label className="relative border-2 border-dashed border-border hover:border-brand-gold/80 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-bg/50 hover:bg-surface-alt/30 transition-all text-center">
              <UploadCloud size={32} className="text-brand-gold mb-2" />
              <span className="text-xs font-semibold text-text">
                {uploadingImage ? 'Uploading via Multer...' : 'Click to select or drag & drop high-resolution photos'}
              </span>
              <span className="text-[11px] text-text-muted mt-1">
                JPEG, PNG, WebP or AVIF (Up to 5MB per image)
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>

            {/* Reorderable Image Gallery with Layout Animation */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((imgUrl, idx) => (
                  <motion.div
                    layout
                    key={imgUrl}
                    className="relative group rounded-lg overflow-hidden border border-border bg-surface-alt aspect-3/4 shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`Product preview ${idx + 1}`}
                      className="w-full h-full object-cover object-top"
                    />

                    {/* Thumbnail Badge */}
                    {idx === 0 && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-crimson text-white text-[10px] font-bold shadow flex items-center gap-1">
                        <Star size={10} fill="white" />
                        <span>Thumbnail</span>
                      </div>
                    )}

                    {/* Controls Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDeleteImageTarget(idx)}
                          className="p-1 rounded bg-danger/80 text-white hover:bg-danger"
                          title="Delete photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-white text-[10px]">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'left')}
                            className="p-1 rounded bg-surface/30 hover:bg-surface/60"
                            title="Move left"
                          >
                            <MoveLeft size={12} />
                          </button>
                        )}

                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => setAsPrimaryImage(idx)}
                            className="px-1.5 py-0.5 rounded bg-brand-gold text-black font-semibold text-[9px]"
                          >
                            Make Primary
                          </button>
                        )}

                        {idx < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'right')}
                            className="p-1 rounded bg-surface/30 hover:bg-surface/60 ml-auto"
                            title="Move right"
                          >
                            <MoveRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Specifications */}
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <h2 className="font-serif text-lg font-semibold text-text flex items-center gap-2 border-b border-border pb-3">
              <Layers size={17} className="text-brand-crimson" />
              <span>Artisanal Specifications</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Fabric & Weave</label>
                <input
                  type="text"
                  value={fabric}
                  onChange={(e) => {
                    setFabric(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. Pure Katan Silk, Zari Brocade"
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Occasion</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => {
                    setOccasion(e.target.value);
                    markDirty();
                  }}
                  placeholder="e.g. Bridal, Festive Reception"
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Care Instructions</label>
              <input
                type="text"
                value={careInstructions}
                onChange={(e) => {
                  setCareInstructions(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. Strictly dry clean only. Store wrapped in muslin cloth."
                className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-xs text-text focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 5: Variant Matrix */}
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="font-serif text-lg font-semibold text-text">Variant Matrix & Stock</h2>
                <p className="text-[11px] text-text-muted">
                  Choose sizes and colours to generate SKUs and manage inventory per variant.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateMatrix}
                className="px-3 py-1.5 rounded-lg bg-brand-gold/15 text-brand-gold font-semibold text-xs border border-brand-gold/30 hover:bg-brand-gold/25 transition-colors self-start"
              >
                Regenerate Matrix
              </button>
            </div>

            {/* Size Selector */}
            <div>
              <label className="block text-xs font-medium text-text mb-2">Sizes Included:</label>
              <div className="flex flex-wrap gap-1.5">
                {SIZES_AVAILABLE.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setSelectedSizes((prev) =>
                          isSelected ? prev.filter((s) => s !== sz) : [...prev, sz]
                        );
                        markDirty();
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-brand-crimson text-white border-brand-crimson'
                          : 'bg-bg text-text-muted border-border hover:border-text-muted'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className="block text-xs font-medium text-text mb-2">Colours Included:</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => {
                  const isSelected = selectedColors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setSelectedColors((prev) =>
                          isSelected ? prev.filter((clr) => clr !== c.name) : [...prev, c.name]
                        );
                        markDirty();
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-surface-alt border-brand-gold text-text shadow-xs'
                          : 'bg-bg border-border text-text-muted'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                      {isSelected && <Check size={12} className="text-brand-gold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generated Variants Table */}
            <div className="border border-border rounded-lg overflow-hidden mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-alt/60 text-text-muted font-medium border-b border-border">
                  <tr>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Colour</th>
                    <th className="p-2.5">Variant SKU</th>
                    <th className="p-2.5 w-24">Stock</th>
                    <th className="p-2.5 w-28">Price Override</th>
                    <th className="p-2.5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {variants.map((v, idx) => (
                    <tr key={`${v.size}-${v.color}-${idx}`} className="hover:bg-surface-alt/30">
                      <td className="p-2.5 font-semibold text-text">{v.size}</td>
                      <td className="p-2.5 text-text">{v.color}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={v.variant_sku}
                          onChange={(e) => handleUpdateVariant(idx, 'variant_sku', e.target.value.toUpperCase())}
                          className="w-full px-2 py-1 rounded bg-bg border border-border font-mono text-[11px] text-text"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min={0}
                          value={v.stock}
                          onChange={(e) => handleUpdateVariant(idx, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-2 py-1 rounded bg-bg border border-border text-xs font-semibold text-text"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          placeholder="None"
                          value={v.price_override ? Math.round(v.price_override / 100) : ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null;
                            handleUpdateVariant(idx, 'price_override', val);
                          }}
                          className="w-full px-2 py-1 rounded bg-bg border border-border text-xs text-text placeholder:text-text-muted"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(idx)}
                          className="p-1 text-text-muted hover:text-danger rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* ── Live Customer-Facing Product Card Preview (Right Column) ──────── */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="p-5 rounded-xl bg-surface border border-border shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Customer Card Preview
              </span>
              <span className="text-[10px] text-text-muted">Updates as you type</span>
            </div>

            {/* Product Card Imitation */}
            <div className="max-w-[280px] mx-auto rounded-xl bg-surface border border-border overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
              {/* Image Frame */}
              <div className="relative aspect-3/4 bg-surface-alt overflow-hidden">
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt="Preview"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted p-4 text-center">
                    <ImageIcon size={32} className="text-border mb-2" />
                    <span className="text-xs">Add an image to preview card</span>
                  </div>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-crimson text-white text-[10px] font-bold shadow-sm">
                    {discountPercent}% OFF
                  </div>
                )}

                {/* Curated Style Brand Tag */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[9px] font-serif tracking-widest uppercase">
                  Curated Style
                </div>
              </div>

              {/* Text Info */}
              <div className="p-3.5 space-y-1.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {categoryName} &bull; <span className="capitalize">{gender}</span>
                </div>

                <h3 className="font-serif text-sm font-semibold text-text line-clamp-1 leading-snug">
                  {name || 'Product Title Appears Here'}
                </h3>

                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-serif text-base font-bold text-brand-crimson">
                    {formatPrice(sellingPricePaise)}
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-xs text-text-muted line-through">
                      {formatPrice(mrpInr * 100)}
                    </span>
                  )}
                </div>

                {/* Available Sizes preview */}
                <div className="pt-2 flex items-center gap-1 border-t border-border/60">
                  <span className="text-[10px] text-text-muted">Sizes:</span>
                  <div className="flex items-center gap-1">
                    {selectedSizes.slice(0, 4).map((s) => (
                      <span key={s} className="text-[9px] px-1 py-0.2 rounded bg-surface-alt text-text font-mono">
                        {s}
                      </span>
                    ))}
                    {selectedSizes.length > 4 && (
                      <span className="text-[9px] text-text-muted">+{selectedSizes.length - 4}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Hint */}
            <p className="text-[11px] text-text-muted text-center mt-4">
              This card simulates exactly how customers see this garment on the storefront catalog grid and carousels.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteImageTarget !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-sm w-full bg-surface border border-border rounded-xl p-6 text-center shadow-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-text">Remove Image?</h3>
                <p className="text-xs text-text-muted mt-1">
                  Are you sure you want to remove this image from the product gallery?
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteImageTarget(null)}
                  className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-text hover:bg-surface-alt"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteImage(deleteImageTarget)}
                  className="flex-1 py-2 rounded-lg bg-danger text-white text-xs font-semibold shadow hover:bg-danger/90"
                >
                  Delete Image
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
