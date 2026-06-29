import React, { useState } from 'react';
import { EmptyState } from './_shared.jsx';

function Avatar({ person }) {
  const [broken, setBroken] = useState(false);
  const init = (person.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="avatar-cell">
      {person.avatar && !broken ? (
        <img
          src={person.avatar}
          alt={person.name || 'Team member'}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="avatar-fallback" aria-hidden="true">
          {init}
        </div>
      )}
      <span className="nm">{person.name || '—'}</span>
      <span className="meta">
        {[person.role, person.country].filter(Boolean).join(' · ')}
      </span>
    </div>
  );
}

// widgetData: { people:[{name,avatar,role,country}] }
export default function AvatarGrid({ data }) {
  const people = data && Array.isArray(data.people) ? data.people : [];
  if (people.length === 0) return <EmptyState message="No people" />;
  return (
    <div className="avatar-grid" role="list" aria-label="People">
      {people.map((p, i) => (
        <div role="listitem" key={`${p.name || 'p'}-${i}`}>
          <Avatar person={p} />
        </div>
      ))}
    </div>
  );
}
