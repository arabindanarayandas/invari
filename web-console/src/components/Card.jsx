/**
 * Card component following the "Observational Blueprint" design system
 * - Tonal layering instead of shadows for depth
 * - Sharp edges (max 8px radius) for industrial feel
 * - Level 2 surface (surface-container-lowest) for active work areas
 */
const Card = ({
  children,
  className = "",
  onClick,
  variant = 'default',
  noPadding = false,
  hover = true
}) => {
  const baseClasses = 'overflow-hidden transition-colors duration-150';

  const variantClasses = {
    // Default: Level 2 surface with no border (tonal layering)
    default: 'bg-surface-container-lowest',
    // Elevated: For floating elements with ghost border
    elevated: 'bg-surface-container-lowest ghost-border',
    // Outlined: With visible border for data-dense areas
    outlined: 'bg-surface-container-lowest border border-outline-variant',
    // Surface: Level 0 for base sections
    surface: 'bg-surface',
    // Container: Level 1 for secondary panels
    container: 'bg-surface-container-low',
  };

  const hoverClasses = hover && onClick ? 'hover:bg-surface-container-high cursor-pointer' : '';
  const paddingClasses = noPadding ? '' : 'p-4';
  const radiusClasses = 'rounded-md'; // 8px max for industrial feel

  const classes = [
    baseClasses,
    variantClasses[variant],
    hoverClasses,
    paddingClasses,
    radiusClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
