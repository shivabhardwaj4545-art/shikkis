import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { Product, Banner } from '../../shared/types/index.ts';
import { ProductCard } from '../components/catalog/ProductCard.tsx';
import { Button } from '../components/ui/Button.tsx';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, bannerRes] = await Promise.all([
          fetch('/api/products?isFeatured=true'),
          fetch('/api/products/banners'),
        ]);

        if (prodRes.ok) {
          const pData = await prodRes.json();
          setFeaturedProducts(pData.products.slice(0, 4));
        }

        if (bannerRes.ok) {
          const bData = await bannerRes.json();
          setBanners(bData.banners);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const mainBanner = banners[0] || {
    title: 'The Heritage Festive Collection \'26',
    subtitle: 'Exquisite Handcrafted Indian & Fusion Couture for Weddings and Celebrations',
    ctaText: 'Explore Collection',
    ctaLink: '/catalog',
    badgeText: 'FESTIVE OFFER — FLAT 15% OFF WITH CODE: SHIKKIS15',
  };

  return (
    <div className="space-y-48">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-alt/40 border-b border-border py-48 sm:py-72 px-16 sm:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-32 items-center">
          <div className="space-y-20">
            {mainBanner.badgeText && (
              <span className="inline-flex items-center gap-6 px-12 py-6 text-xs font-bold text-brand-crimson dark:text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-sm uppercase tracking-wider">
                <Sparkles className="w-14 h-14" /> {mainBanner.badgeText}
              </span>
            )}
            <h1 className="font-serif text-36 sm:text-48 font-bold text-text leading-tight">
              {mainBanner.title}
            </h1>
            <p className="text-base text-text-muted leading-relaxed font-sans max-w-lg">
              {mainBanner.subtitle}
            </p>
            <div className="flex flex-wrap gap-16 pt-8">
              <Link to={mainBanner.ctaLink}>
                <Button size="lg" className="flex items-center gap-8">
                  {mainBanner.ctaText} <ArrowRight className="w-18 h-18" />
                </Button>
              </Link>
              <Link to="/catalog?gender=women">
                <Button variant="outline" size="lg">
                  Bridal Sarees & Lehengas
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-border shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80"
              alt="Shikkis Heritage Collection"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-24">
              <p className="text-white font-serif text-20 font-bold">Imperial Banarasi Zardozi — Jaipur Atelier</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Department Showcases */}
      <section className="max-w-7xl mx-auto px-16 sm:px-24 space-y-24">
        <div className="text-center space-y-8">
          <h2 className="font-serif text-28 sm:text-36 font-bold text-text">Curated Departments</h2>
          <p className="text-xs text-text-muted uppercase tracking-widest">Handcrafted Excellence for Men & Women</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          <Link
            to="/catalog?gender=women"
            className="group relative h-80 rounded-md overflow-hidden border border-border flex items-end p-24"
          >
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80"
              alt="Women Couture"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 text-white space-y-4">
              <span className="text-xs uppercase font-bold text-brand-gold tracking-widest">Women Couture</span>
              <h3 className="font-serif text-28 font-bold">Bridal Sarees, Lehengas & Anarkalis</h3>
              <p className="text-xs text-slate-200">Explore Silk Zardozi, Gota Patti, and Kashmiri Tilla Work</p>
            </div>
          </Link>

          <Link
            to="/catalog?gender=men"
            className="group relative h-80 rounded-md overflow-hidden border border-border flex items-end p-24"
          >
            <img
              src="https://images.unsplash.com/photo-1597983073493-88cd35cf03b0?auto=format&fit=crop&w=1000&q=80"
              alt="Men Heritage"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 text-white space-y-4">
              <span className="text-xs uppercase font-bold text-brand-gold tracking-widest">Men Heritage</span>
              <h3 className="font-serif text-28 font-bold">Royal Sherwanis, Kurtas & Jackets</h3>
              <p className="text-xs text-slate-200">Bespoke Groom & Festive Attire Handwoven in Pure Silk</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Masterpieces */}
      <section className="max-w-7xl mx-auto px-16 sm:px-24 space-y-24">
        <div className="flex items-end justify-between border-b border-border pb-16">
          <div>
            <h2 className="font-serif text-28 font-bold text-text">Featured Masterpieces</h2>
            <p className="text-xs text-text-muted mt-4">Handpicked bridal & festive creations</p>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-brand-crimson dark:text-brand-gold hover:underline flex items-center gap-4">
            View All Couture <ArrowRight className="w-14 h-14" />
          </Link>
        </div>

        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24">
            {featuredProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Physical Atelier Visit Highlight */}
      <section className="max-w-7xl mx-auto px-16 sm:px-24">
        <div className="bg-surface border border-border rounded-md p-32 sm:p-48 grid grid-cols-1 md:grid-cols-3 gap-24 items-center">
          <div className="md:col-span-2 space-y-12">
            <span className="text-xs uppercase font-bold text-brand-gold tracking-widest flex items-center gap-6">
              <MapPin className="w-16 h-16" /> Physical Flagship Store & Fitting Studio
            </span>
            <h3 className="font-serif text-28 font-bold text-text">Experience Bespoke Tailoring in Jaipur</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Visit our flagship Johari Bazaar store for private master tailor draping consultations, custom embroidery colorway matching, and bridal party appointments.
            </p>
          </div>
          <div className="flex flex-col gap-12 text-center md:text-right">
            <span className="text-xs font-bold text-text">Open Monday – Sunday, 10 AM – 8 PM</span>
            <Link to="/catalog">
              <Button variant="gold" fullWidth>
                Book Master Tailor Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
