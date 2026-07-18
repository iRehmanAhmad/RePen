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
    <section className="inspector-card">
      <div className="inspector-card__header">
        <div className="inspector-card__heading">
          <span className="inspector-card__title">{title}</span>
          {description && <span className="inspector-card__description">{description}</span>}
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
      <div className="inspector-card__body">
        {children}
      </div>
    </section>
  );
};
