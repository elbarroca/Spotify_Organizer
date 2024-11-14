import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 rounded-lg font-medium transition-colors',
        variant === 'primary'
          ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
          : 'border border-white/10 text-white hover:bg-white/5',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}