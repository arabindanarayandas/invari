/**
 * Card component following the "Technical Editorial" design system
 * - Tonal layering instead of shadows for depth
 * - 12px border radius for refined card styling
 * - Outline borders (#BCCAC1) for subtle definition
 * - Surface hierarchy for visual organization
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
    // Outlined: With visible outline border (#BCCAC1) for definition
    outlined: 'bg-surface-container-lowest border border-outline',
    // Surface: Level 0 for base sections
    surface: 'bg-surface',
    // Container: Level 1 for secondary panels
    container: 'bg-surface-container-low',
  };

  const hoverClasses = hover && onClick ? 'hover:bg-surface-container-high cursor-pointer' : '';
  const paddingClasses = noPadding ? '' : 'p-4';
  const radiusClasses = 'rounded-[12px]'; // 12px for refined card styling

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
