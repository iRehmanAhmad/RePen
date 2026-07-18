import React, { useState } from 'react';

interface PropertyCardProps {
  title: string;
  description?: string;
  onReset?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  description,
  onReset,
  collapsible = false,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => {
    if (collapsible) setIsOpen((open) => !open);
  };

  return (
    <section className={`inspector-card${collapsible ? ' inspector-card--collapsible' : ''}${isOpen ? ' is-open' : ''}`}>
      <div
        className="inspector-card__header"
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (collapsible && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <div className="inspector-card__heading">
          <span className="inspector-card__title">{collapsible && <span className="inspector-card__chevron" aria-hidden="true">{isOpen ? '⌄' : '›'}</span>}{title}</span>
          {description && <span className="inspector-card__description">{description}</span>}
        </div>
        {onReset && (
          <button
            className="menu-btn"
            style={{ padding: '2px 6px', fontSize: '10px', height: '18px', display: 'flex', alignItems: 'center' }}
            onClick={(event) => {
              event.stopPropagation();
              onReset();
            }}
          >
            Reset
          </button>
        )}
      </div>
      {isOpen && <div className="inspector-card__body">{children}</div>}
    </section>
  );
};
