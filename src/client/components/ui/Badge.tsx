import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'crimson' | 'success' | 'warning' | 'danger' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gold', className = '' }) => {
  const variantStyles = {
    gold: 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40',
    crimson: 'bg-brand-crimson text-white',
    success: 'bg-success/20 text-success border border-success/40',
    warning: 'bg-warning/20 text-warning border border-warning/40',
    danger: 'bg-danger/20 text-danger border border-danger/40',
    outline: 'border border-border text-text-muted',
  };

  return (
    <span className={`inline-flex items-center px-8 py-4 text-xs font-semibold rounded-sm tracking-wider uppercase ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
