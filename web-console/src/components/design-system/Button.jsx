import React from 'react';

/**
 * Button component following the "Technical Editorial" design system
 * - 8px border radius for refined edges
 * - Hover opacity: 0.88 for subtle interaction
 * - 13px font size with precise padding
 * - Primary: Emerald green (#1D9E75)
 * - Secondary: Surface tonal layers
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
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px]';

  const variantClasses = {
    primary: 'bg-primary text-white hover:opacity-88 active:opacity-75', /* Emerald green */
    secondary: 'bg-surface-container-high text-on-surface hover:opacity-88 active:opacity-75', /* Tonal layering */
    ghost: 'text-on-surface hover:bg-surface-container-low active:bg-surface-container-high hover:opacity-88',
    danger: 'bg-red-600 text-white hover:opacity-88 active:opacity-75',
    repair: 'bg-repair text-white hover:opacity-88 active:opacity-75',
    success: 'bg-success text-white hover:opacity-88 active:opacity-75',
  };

  const sizeClasses = {
    xs: 'px-[12px] py-[6px] text-[11px] gap-1',
    sm: 'px-[15px] py-[7px] text-[12px] gap-1.5',
    md: 'px-[18px] py-[9px] text-[13px] gap-2',
    lg: 'px-[24px] py-[12px] text-[14px] gap-2.5',
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