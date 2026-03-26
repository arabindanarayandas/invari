import React from 'react';

/**
 * Input component following the "Observational Blueprint" design system
 * - 1px stroke with outline-variant color
 * - On focus: stroke transitions to primary (no outer glows)
 * - 4px corner radius for industrial feel
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
  const baseClasses = 'block font-sans text-on-surface bg-surface-container-lowest border border-outline-variant rounded-sm focus-clinical focus:border-primary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'h-8 px-3 text-body-sm',
    md: 'h-10 px-4 text-body-md',
    lg: 'h-12 px-5 text-body-lg',
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
        <label className="block text-body-sm font-medium text-on-surface mb-1">
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
  const baseClasses = 'block font-sans text-on-surface bg-surface-container-lowest border border-outline-variant rounded-sm focus-clinical focus:border-primary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

  const sizeClasses = {
    sm: 'px-3 py-2 text-body-sm',
    md: 'px-4 py-2.5 text-body-md',
    lg: 'px-5 py-3 text-body-lg',
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
        <label className="block text-body-sm font-medium text-on-surface mb-1">
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