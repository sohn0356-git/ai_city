import React, { useState } from 'react';
import ResidentAvatar from '../ResidentAvatar';
import { filterResidents } from '../observation.mjs';

export default function ResidentList({
  residents,
  places,
  placeId,
  onPlace,
  onSelect,
  compact = false,
}) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('all');
  const filtered = filterResidents(residents, { query, phase, placeId });
  return (
    <section className={compact ? 'resident-browser compact-browser' : 'resident-browser'}>
      <div className="panel-title">
        <h2>주민들</h2>
        <span>{filtered.length}명</span>
      </div>
      <label className="search-field">
        <span className="sr-only">이름, 직업, 활동 검색</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 · 직업 · 활동 검색"
        />
      </label>
      <div className="list-filters">
        <label>
          <span className="sr-only">주민 장소</span>
          <select value={placeId} onChange={(e) => onPlace(e.target.value)}>
            <option value="all">모든 장소</option>
            {[...places.values()].map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {!compact && (
          <label>
            <span className="sr-only">활동 종류</span>
            <select value={phase} onChange={(e) => setPhase(e.target.value)}>
              {[
                ['all', '모든 활동'],
                ['working', '일하는 중'],
                ['walking', '이동 중'],
                ['resting', '쉬는 중'],
                ['fighting', '탐험 중'],
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="resident-cards">
        {filtered.map((r) => (
          <button key={r.player.id} className="resident-card" onClick={() => onSelect(r.player.id)}>
            <ResidentAvatar id={r.player.id} />
            <span className="resident-copy">
              <span className="resident-name">
                {r.player.name}
                <small>{r.phase}</small>
              </span>
              <span className="resident-action">{r.summary}</span>
              <span className="resident-location">
                {r.location}
                {r.player.age !== null && r.player.age !== undefined
                  ? ' · ' + Math.floor(r.player.age) + '세'
                  : ''}
                {r.player.illness ? ' · ' + r.player.illness.name : ''}
              </span>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <p>조건에 맞는 주민이 없어요.</p>
          <button
            onClick={() => {
              setQuery('');
              setPhase('all');
              onPlace('all');
            }}
          >
            필터 초기화
          </button>
        </div>
      )}
    </section>
  );
}
