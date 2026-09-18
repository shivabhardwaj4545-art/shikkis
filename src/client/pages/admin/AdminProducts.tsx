import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Product } from '../../../shared/types/index.ts';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { useToastStore } from '../../hooks/useToastStore.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Badge } from '../../components/ui/Badge.tsx';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug] = useState('');
  const [categoryId] = useState('cat-women-sarees');
  const [description, setDescription] = useState('');
  const [fabric] = useState('100% Pure Katan Silk');
  const [craft, setCraft] = useState('Handloom Banarasi Zardozi');
  const [pricePaise, setPricePaise] = useState(1499900);
  const [imageUrl] = useState('https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80');

  const { token } = useAuthStore();
  const { addToast } = useToastStore();

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch admin products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId,
        description,
        fabric,
        craft,
        pricePaise,
        isFeatured: true,
        isActive: true,
        images: [{ imageUrl, isPrimary: true }],
        variants: [
          { size: 'M', color: 'Royal Red', stockQuantity: 20, sku: `SKU-${Date.now()}-M` },
          { size: 'L', color: 'Royal Red', stockQuantity: 15, sku: `SKU-${Date.now()}-L` },
        ],
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('success', 'New couture product added to catalog');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        const errData = await res.json();
        addToast('error', errData.error || 'Failed to add product');
      }
    } catch {
      addToast('error', 'Network error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Product deleted');
        fetchProducts();
      }
    } catch {
      addToast('error', 'Delete failed');
    }
  };

  if (isLoading) return <div className="max-w-7xl mx-auto px-16 py-64 text-center">Loading products...</div>;

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-24">
      <div className="flex justify-between items-center border-b border-border pb-16">
        <div>
          <h1 className="font-serif text-32 font-bold text-text uppercase">Catalog & Inventory Management</h1>
          <p className="text-xs text-text-muted mt-2">Owner Controls for Products & Variants</p>
        </div>
        <div className="flex items-center gap-12">
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-6">
            <Plus className="w-16 h-16" /> Add Product
          </Button>
          <Link to="/admin" className="text-xs font-bold text-brand-gold hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
        {products.map((p) => (
          <div key={p.id} className="bg-surface border border-border p-16 rounded-md flex flex-col justify-between space-y-12">
            <div className="flex gap-12">
              <img src={p.images[0]?.imageUrl} alt={p.title} className="w-20 h-28 object-cover rounded-sm shrink-0" />
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-brand-gold uppercase">{p.categoryName}</span>
                <h3 className="font-serif font-bold text-16 text-text line-clamp-1">{p.title}</h3>
                <p className="text-xs text-text-muted line-clamp-1">{p.craft}</p>
                <p className="font-serif font-bold text-brand-crimson dark:text-brand-gold mt-4">
                  {((p.pricePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="pt-12 border-t border-border flex items-center justify-between text-xs">
              <Badge variant={p.isActive ? 'success' : 'outline'}>{p.isActive ? 'Active' : 'Draft'}</Badge>
              <button
                onClick={() => handleDeleteProduct(p.id)}
                className="text-danger hover:opacity-80 p-8 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Trash2 className="w-16 h-16" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Couture Masterpiece">
        <form onSubmit={handleCreateProduct} className="space-y-16">
          <div>
            <label className="block text-xs font-semibold uppercase mb-4">Product Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Royal Chanderi Silk Suit"
              className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-4">Craft Details</label>
            <input
              type="text"
              required
              value={craft}
              onChange={(e) => setCraft(e.target.value)}
              className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-4">Price in Paise (e.g. 1499900 = ₹14,999)</label>
            <input
              type="number"
              required
              value={pricePaise}
              onChange={(e) => setPricePaise(Number(e.target.value))}
              className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-4">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text"
            />
          </div>

          <Button fullWidth type="submit">
            Save Couture Product
          </Button>
        </form>
      </Modal>
    </div>
  );
};
