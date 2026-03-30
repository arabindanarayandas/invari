import React from 'react';

/**
 * Button component following the "Observational Blueprint" design system
 * - 4px corner radius for industrial sharp edges
 * - No gradients or shadows
 * - Primary: Solid blue (#0052FF) with white text
 * - Secondary: Surface container with on-surface text
 */
export const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker', /* Emerald green */
    secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:bg-surface-container', /* No border - tonal layering */
    ghost: 'text-on-surface hover:bg-surface-container-low active:bg-surface-container-high',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    repair: 'bg-repair text-white hover:bg-orange-700 active:bg-orange-800',
    success: 'bg-success text-white hover:bg-green-700 active:bg-green-800',
  };

  const sizeClasses = {
    xs: 'h-6 px-2 text-label-sm gap-1',
    sm: 'h-8 px-3 text-body-sm gap-1.5',
    md: 'h-10 px-4 text-body-md gap-2',
    lg: 'h-12 px-6 text-body-lg gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClass,
    className,
  ].join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;