import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Layers,
  MoveDown,
  MoveUp,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { api, type AdminBannerItem } from '@/lib/api';

export const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<AdminBannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('Explore Collection');
  const [ctaLink, setCtaLink] = useState('/catalog');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetBanners();
      setBanners(res.data);
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Reorder banners with layout animation
  const moveBanner = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const copy = [...banners];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);

    // Optimistic reorder
    const updated = copy.map((b, i) => ({ ...b, display_order: i + 1 }));
    setBanners(updated);

    try {
      await api.adminReorderBanners(
        updated.map((b) => ({ id: b.id, display_order: b.display_order }))
      );
    } catch (err) {
      console.error('Failed to save banner reorder:', err);
      fetchBanners();
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Delete this carousel banner?')) return;
    try {
      await api.adminDeleteBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete banner:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await api.adminUploadImage(file);
      setImageUrl(res.url);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      setError('Title and image URL are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.adminCreateBanner({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_url: imageUrl.trim(),
        cta_text: ctaText.trim() || 'Shop Collection',
        cta_link: ctaLink.trim() || '/catalog',
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: isActive,
      });

      setModalOpen(false);
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      await fetchBanners();
    } catch (err: any) {
      console.error('Failed to create banner:', err);
      setError(err.message || 'Failed to create banner.');
    } finally {
      setSaving(false);
    }
  };

  const activeBanner = banners[previewIndex] || banners[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text">Hero Carousel Banners</h1>
          <p className="text-xs text-text-muted mt-1">
            Configure full-bleed hero slides, schedule festival announcements, and reorder slide sequence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBanners}
            className="p-2 rounded-lg border border-border bg-surface text-text-muted hover:text-text"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-crimson text-white text-xs font-semibold shadow hover:bg-brand-crimson/90 transition-colors"
          >
            <Plus size={15} />
            <span>Add New Banner</span>
          </button>
        </div>
      </div>

      {/* ── Live Hero Carousel Simulation Preview ───────────────────────────── */}
      {activeBanner && (
        <div className="rounded-2xl border border-border overflow-hidden bg-surface shadow-lg">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface-alt/40">
            <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} />
              <span>Live Customer Storefront Carousel Preview</span>
            </span>
            <div className="flex items-center gap-1.5">
              {banners.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => setPreviewIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    previewIndex === idx ? 'bg-brand-gold w-6' : 'bg-border hover:bg-text-muted'
                  }`}
                  title={b.title}
                />
              ))}
            </div>
          </div>

          {/* Full-bleed hero banner replica */}
          <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-black flex items-center">
            <img
              src={activeBanner.image_url}
              alt={activeBanner.title}
              className="absolute inset-0 w-full h-full object-cover object-center brightness-75"
            />
            {/* Crimson to transparent luxury gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            <div className="relative z-10 max-w-xl px-8 sm:px-12 text-white space-y-3">
              <span className="inline-block font-serif tracking-widest text-[11px] uppercase text-brand-gold">
                Shikkis &bull; Curated Style
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight drop-shadow-md">
                {activeBanner.title}
              </h2>
              {activeBanner.subtitle && (
                <p className="text-xs sm:text-sm text-gray-200 drop-shadow line-clamp-2">
                  {activeBanner.subtitle}
                </p>
              )}
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-crimson text-white text-xs font-semibold shadow-lg">
                  {activeBanner.cta_text || 'Shop Collection'} &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Banners Reorderable List ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-bold text-text flex items-center gap-2">
          <Layers size={17} className="text-brand-crimson" />
          <span>Active Carousel Sequence (Drag or Click to Reorder)</span>
        </h2>

        {banners.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface border border-border text-center text-xs text-text-muted">
            {loading ? 'Loading carousel banners...' : 'No banners created yet. Click "Add New Banner" above.'}
          </div>
        ) : (
          <div className="space-y-2">
            {banners.map((banner, index) => (
              <motion.div
                layout
                key={banner.id}
                className={`p-4 rounded-xl bg-surface border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  previewIndex === index ? 'border-brand-gold' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1 text-text-muted">
                    <button
                      disabled={index === 0}
                      onClick={() => moveBanner(index, 'up')}
                      className="p-1 rounded hover:bg-surface-alt disabled:opacity-30"
                      title="Move up"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      disabled={index === banners.length - 1}
                      onClick={() => moveBanner(index, 'down')}
                      className="p-1 rounded hover:bg-surface-alt disabled:opacity-30"
                      title="Move down"
                    >
                      <MoveDown size={14} />
                    </button>
                  </div>

                  {/* Order Rank Badge */}
                  <div className="w-7 h-7 rounded-full bg-surface-alt border border-border font-mono text-xs font-bold text-text flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-24 h-14 rounded-lg overflow-hidden bg-surface-alt border border-border shrink-0">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="font-serif text-base font-bold text-text line-clamp-1">{banner.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span>CTA: {banner.cta_text}</span>
                      <span>&bull;</span>
                      <span className="font-mono">{banner.cta_link}</span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setPreviewIndex(index)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-text hover:bg-surface-alt"
                  >
                    Preview in Hero
                  </button>

                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-2 rounded-lg border border-border text-text-muted hover:text-danger hover:bg-danger/10"
                    title="Delete banner"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Banner Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-lg w-full bg-surface border border-border rounded-xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif text-xl font-bold text-text">Create Carousel Banner</h3>
                <button onClick={() => setModalOpen(false)} className="p-1 text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded bg-danger/10 text-danger text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateBanner} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-text mb-1">Banner Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Heritage Scarlet Red Bridal Lehenga"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Handcrafted Varanasi Silk Zari Brocade"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text focus:outline-hidden"
                  />
                </div>

                {/* Media upload or URL */}
                <div>
                  <label className="block font-semibold text-text mb-1">Banner Image *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="/uploads/banner.jpg or https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono text-[11px]"
                    />
                    <label className="cursor-pointer px-3 py-2 rounded-lg border border-border bg-surface-alt hover:bg-surface text-text font-medium text-[11px]">
                      <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text mb-1">Button Text</label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text mb-1">Button Link</label>
                    <input
                      type="text"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text mb-1">Schedule Start (Optional)</label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text mb-1">Schedule End (Optional)</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="banner-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-brand-crimson"
                  />
                  <label htmlFor="banner-active" className="font-semibold text-text">
                    Active immediately upon saving
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border text-text hover:bg-surface-alt"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-brand-crimson text-white font-semibold shadow hover:bg-brand-crimson/90 disabled:opacity-50"
                  >
                    {saving ? 'Publishing...' : 'Publish Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
