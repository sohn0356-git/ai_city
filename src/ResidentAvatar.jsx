import React from 'react';
import { hashSeed } from './simulation/catalog.mjs';
export default function ResidentAvatar({ id, className = '' }) {
  const raw = Number(id.slice(1)) - 1;
  const i = Number.isInteger(raw) && raw >= 0 && raw < 21 ? raw : hashSeed(id) % 21;
  if (id === 'p022')
    return (
      <span
        className={`resident-avatar ${className}`}
        aria-hidden="true"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}tiles/maintenance-v17.png)`,
          backgroundSize: '200% 200%',
          backgroundPosition: '0% 0%',
        }}
      />
    );
  return (
    <span
      className={`resident-avatar ${className}`}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}tiles/residents-v12.png)`,
        backgroundPosition: `${(i % 5) * 25}% ${Math.floor(i / 5) * 25}%`,
      }}
    />
  );
}
