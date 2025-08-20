// src/components/ui/button.tsx
import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg'; 
  className?: string;
};
export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  className,
  children,
  ...props
}) => {
  const baseStyle = 'rounded font-medium transition';
  const variantStyle =
    variant === 'outline'
      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
      : 'bg-blue-600 text-white hover:bg-blue-700';

  const sizeStyle =
    size === 'sm'
      ? 'px-3 py-1 text-sm'
      : size === 'lg'
      ? 'px-6 py-3 text-lg'
      : 'px-4 py-2';

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
};