import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] rounded-sm';

  const variantClasses = {
    primary: 'bg-brand-crimson text-white hover:opacity-90 active:scale-[0.98]',
    secondary: 'bg-surface-alt text-text hover:bg-opacity-80 active:scale-[0.98]',
    outline: 'border border-border text-text hover:border-brand-gold hover:text-brand-gold active:scale-[0.98]',
    ghost: 'text-text hover:bg-surface-alt/50 active:scale-[0.98]',
    gold: 'bg-brand-gold text-text hover:opacity-90 active:scale-[0.98]',
  };

  const sizeClasses = {
    sm: 'text-xs px-12 py-8 min-h-[44px]',
    md: 'text-sm px-16 py-12 min-h-[44px]',
    lg: 'text-base px-24 py-16 min-h-[48px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
