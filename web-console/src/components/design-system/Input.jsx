import React from 'react';

/**
 * Input component following the "Technical Editorial" design system
 * - 8px border radius for refined edges
 * - Surface-low background (#F4F3F0)
 * - Outline-variant borders (#BCCAC1)
 * - Mono labels with uppercase styling
 * - 10px 13px padding for inputs
 */
export const Input = React.forwardRef(({
  type = 'text',
  size = 'md',
  fullWidth = true,
  disabled = false,
  error = false,
  className = '',
  label,
  helperText,
  startIcon,
  endIcon,
  ...props
}, ref) => {
  const baseClasses = 'block font-sans text-on-surface bg-surface-container-low border border-outline-variant rounded-[8px] focus-clinical focus:border-primary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-[11px] py-[8px] text-[12px]',
    md: 'px-[13px] py-[10px] text-[13px]',
    lg: 'px-[15px] py-[12px] text-[14px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:border-red-600' : '';

  const inputClasses = [
    baseClasses,
    sizeClasses[size],
    widthClass,
    errorClass,
    startIcon ? 'pl-10' : '',
    endIcon ? 'pr-10' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block font-mono text-[10px] uppercase tracking-[0.1em] font-semibold text-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {startIcon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
        {endIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {endIcon}
          </span>
        )}
      </div>
      {helperText && (
        <p className={`mt-1 text-label-sm ${error ? 'text-red-500' : 'text-on-surface-variant'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea component extending Input design principles
 */
export const Textarea = React.forwardRef(({
  size = 'md',
  fullWidth = true,
  disabled = false,
  error = false,
  className = '',
  label,
  helperText,
  rows = 4,
  ...props
}, ref) => {
  const baseClasses = 'block font-sans text-on-surface bg-surface-container-low border border-outline-variant rounded-[8px] focus-clinical focus:border-primary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

  const sizeClasses = {
    sm: 'px-[11px] py-[8px] text-[12px]',
    md: 'px-[13px] py-[10px] text-[13px]',
    lg: 'px-[15px] py-[12px] text-[14px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:border-red-600' : '';

  const textareaClasses = [
    baseClasses,
    sizeClasses[size],
    widthClass,
    errorClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block font-mono text-[10px] uppercase tracking-[0.1em] font-semibold text-muted mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={textareaClasses}
        disabled={disabled}
        {...props}
      />
      {helperText && (
        <p className={`mt-1 text-label-sm ${error ? 'text-red-500' : 'text-on-surface-variant'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;