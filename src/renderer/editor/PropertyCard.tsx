import React from 'react';

interface PropertyCardProps {
  title: string;
  description?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  description,
  onReset,
  children,
}) => {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--line)',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text)' }}>{title}</span>
          {description && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{description}</span>}
        </div>
        {onReset && (
          <button
            className="menu-btn"
            style={{ padding: '2px 6px', fontSize: '10px', height: '18px', display: 'flex', alignItems: 'center' }}
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
};
