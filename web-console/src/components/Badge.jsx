/**
 * Badge component following the "Observational Blueprint" design system
 * - Uses semantic colors for status indication
 * - Sharp edges with minimal radius for industrial feel
 * - JetBrains Mono for technical data display
 */
const Badge = ({ status, variant = 'default', size = 'sm' }) => {
  // Status-based styles using design system colors
  const statusStyles = {
    stable: "bg-success/10 text-success border-success/20",
    repaired: "bg-repair/10 text-repair border-repair/20",
    blocked: "bg-red-500/10 text-red-600 border-red-500/20",
    active: "bg-primary/10 text-primary border-primary/20",
    inactive: "bg-surface-container-high text-on-surface-variant border-outline-variant",
  };

  // Variant styles for different contexts
  const variantStyles = {
    default: statusStyles[status] || statusStyles.inactive,
    solid: {
      stable: "bg-success text-white",
      repaired: "bg-repair text-white",
      blocked: "bg-red-600 text-white",
      active: "bg-primary text-white",
      inactive: "bg-surface-container-high text-on-surface-variant",
    }[status] || "bg-surface-container-high text-on-surface-variant",
    outline: statusStyles[status] || statusStyles.inactive,
  };

  // Size classes following 4px grid
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-label-sm",
    md: "px-3 py-1 text-label-md",
    lg: "px-4 py-1.5 text-body-sm",
  };

  const baseClasses = "inline-flex items-center font-mono uppercase tracking-wider font-semibold rounded-xs";
  const borderClass = variant === 'solid' ? '' : 'border';

  return (
    <span className={`
      ${baseClasses}
      ${sizeClasses[size]}
      ${variantStyles[variant] || variantStyles.default}
      ${borderClass}
    `}>
      {status}
    </span>
  );
};

export default Badge;
