import React from 'react';
import { EmptyState } from './_shared.jsx';

export default function KanbanW({ data }) {
  const columns = data && Array.isArray(data.columns) ? data.columns : [];
  if (columns.length === 0) return <EmptyState message="No board data" />;

  return (
    <div className="kanban" role="list" aria-label="Kanban board">
      {columns.map((col, ci) => {
        const cards = Array.isArray(col.cards) ? col.cards : [];
        return (
          <div className="kanban-col" role="listitem" key={`${col.name}-${ci}`}>
            <div className="kanban-col-head">
              <span>{col.name || 'Column'}</span>
              <span aria-label={`${cards.length} cards`}>{cards.length}</span>
            </div>
            {cards.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px' }}>—</div>
            ) : (
              cards.map((card, ki) => (
                <div className="kanban-card" key={`${card.title}-${ki}`}>
                  <div>{card.title || 'Untitled'}</div>
                  {card.meta ? <div className="meta">{card.meta}</div> : null}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
