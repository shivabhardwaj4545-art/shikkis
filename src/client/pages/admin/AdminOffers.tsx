import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner } from '../../../shared/types/index.ts';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';

export const AdminOffers: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();

  const fetchBanners = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/banners', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners);
      }
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  if (isLoading) return <div className="max-w-7xl mx-auto px-16 py-64 text-center">Loading banners...</div>;

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-24">
      <div className="flex justify-between items-center border-b border-border pb-16">
        <div>
          <h1 className="font-serif text-32 font-bold text-text uppercase">Offers & Shimmer Banners</h1>
          <p className="text-xs text-text-muted mt-2">Manage Store Header Announcements & Campaign Banners</p>
        </div>
        <Link to="/admin" className="text-xs font-bold text-brand-gold hover:underline">
          Back to Overview
        </Link>
      </div>

      <div className="space-y-16">
        {banners.map((b) => (
          <div key={b.id} className="p-24 bg-surface border border-border rounded-md space-y-12">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="gold">{b.badgeText || 'Active Banner'}</Badge>
                <h3 className="font-serif text-24 font-bold text-text mt-8">{b.title}</h3>
                <p className="text-xs text-text-muted mt-4">{b.subtitle}</p>
              </div>
              <Badge variant={b.isActive ? 'success' : 'outline'}>{b.isActive ? 'Active' : 'Disabled'}</Badge>
            </div>

            <div className="pt-12 border-t border-border flex items-center justify-between text-xs">
              <span>CTA: <strong>{b.ctaText}</strong> ({b.ctaLink})</span>
              <Button size="sm" variant="outline">Edit Campaign</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
