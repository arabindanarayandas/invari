import React from 'react';

/**
 * DataGrid component following the "Observational Blueprint" design system
 * - High-density proxy log rows (32px fixed height)
 * - JetBrains Mono for technical data
 * - 1px vertical rules between columns (spreadsheet feel)
 * - No horizontal dividers for cleaner look
 */
export const DataGrid = ({
  columns = [],
  data = [],
  onRowClick,
  className = '',
  striped = false,
  compact = true,
}) => {
  const rowHeight = compact ? 'h-8' : 'h-10'; // 32px or 40px following 4px grid

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-surface-container-low"> {/* No border - use background for separation */}
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                className={`
                  text-left font-sans font-medium text-label-sm text-on-surface-variant
                  px-4 py-4
                  ${column.width ? column.width : ''}
                `}
                style={column.minWidth ? { minWidth: column.minWidth } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className={`
                ${rowHeight}
                ${striped && rowIndex % 2 === 1 ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest'}
                hover:bg-surface-container-high transition-colors duration-150
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={`${rowIndex}-${column.key || colIndex}`}
                  className={`
                    px-4 py-3 text-label-sm font-mono text-on-surface
                    ${column.className || ''}
                  `}
                >
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-display-lg font-bold text-on-surface-variant/30">
            No Data
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * DataGridHeader component for actions above the grid
 */
export const DataGridHeader = ({ title, actions, className = '' }) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-heading-sm font-semibold text-on-surface">{title}</h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default DataGrid;