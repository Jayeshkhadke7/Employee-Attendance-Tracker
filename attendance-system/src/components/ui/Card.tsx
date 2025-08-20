import React from 'react';

type CardProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={`border rounded shadow-sm bg-white ${className ?? ''}`} {...props}>
      {children}
    </div>
  );
}

type CardSectionProps = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>;

export function CardHeader({ children, className, ...props }: CardSectionProps) {
  return (
    <div className={`border-b px-4 py-2 ${className ?? ''}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: CardSectionProps) {
  return (
    <div className={`p-4 ${className ?? ''}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: CardSectionProps) {
  return (
    <h2 className={`font-bold text-lg ${className ?? ''}`} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: CardSectionProps) {
  return (
    <p className={`text-sm text-gray-500 ${className ?? ''}`} {...props}>
      {children}
    </p>
  );
}
