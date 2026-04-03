/**
 * Badge component following the "Technical Editorial" design system
 * - Status badges with 7px dots and labels
 * - Industry chips with 100px pill-shaped borders
 * - HTTP method badges with exact HTML colors
 * - JetBrains Mono for technical display
 */
const Badge = ({
  status,
  variant = 'default',
  size = 'sm',
  type = 'status', // 'status', 'industry', 'method'
  showDot = false
}) => {
  // Status-based styles using design system colors
  const statusStyles = {
    stable: "bg-[#d4f0e7] text-[#166534]", // green-dim
    repaired: "bg-[#fef3c7] text-[#b45309]", // amber-dim
    blocked: "bg-[#fee2e2] text-[#dc2626]", // red-dim
    active: "bg-primary/10 text-primary",
    inactive: "bg-surface-container-high text-on-surface-variant",
  };

  // HTTP Method badge colors (exact from HTML)
  const methodStyles = {
    GET: "bg-[#dcfce7] text-[#166534]",
    POST: "bg-[#dbeafe] text-[#1d4ed8]",
    PATCH: "bg-[#fef3c7] text-[#b45309]",
    PUT: "bg-[#fef3c7] text-[#b45309]",
    DELETE: "bg-[#fee2e2] text-[#dc2626]",
  };

  // Industry chip colors
  const industryStyles = {
    health: "bg-[#dcfce7] text-[#166534]",
    finance: "bg-[#dbeafe] text-[#1e40af]",
    wellness: "bg-emerald-100 text-primary",
    insurance: "bg-orange-100 text-warning",
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
    method: methodStyles[status] || "bg-surface-container-low text-on-surface-variant",
    industry: industryStyles[status?.toLowerCase()] || "bg-surface-container-low text-on-surface-variant",
  };

  // Size classes
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px]",
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-[11px]",
    lg: "px-4 py-1.5 text-[12px]",
  };

  // Border radius based on type
  const radiusClass = type === 'industry' ? 'rounded-[100px]' : 'rounded';

  const baseClasses = "inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.1em] font-bold";

  // Status dot (7px rounded-full)
  const dotElement = showDot && (
    <span className={`w-[7px] h-[7px] rounded-full ${
      status === 'stable' ? 'bg-[#166534]' :
      status === 'repaired' ? 'bg-[#b45309]' :
      status === 'blocked' ? 'bg-[#dc2626]' :
      'bg-primary'
    }`} />
  );

  return (
    <span className={`
      ${baseClasses}
      ${sizeClasses[size]}
      ${variantStyles[variant] || variantStyles.default}
      ${radiusClass}
    `}>
      {dotElement}
      {status}
    </span>
  );
};

export default Badge;
