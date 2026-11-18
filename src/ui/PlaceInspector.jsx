import React from 'react';
import { recentEvents } from '../observation.mjs';
import { placeState } from '../placeState.mjs';
import ResidentList from './ResidentList';

export default function PlaceInspector({ placeId, observation, now, onClose, onSelect, onPlace }) {
  const { world, places, residents } = observation;
  const place = places.get(placeId);
  if (!place) return null;
  const state = placeState(world, placeId, now);
  const events = recentEvents(world, { placeId }).slice(0, 3);
  return (
    <aside className="place-inspector">
      <div className="panel-title">
        <h2>{place.name}</h2>
        <button onClick={onClose}>닫기 ×</button>
      </div>
      <p>{state.situation}</p>
      <ResidentList
        key={placeId}
        residents={residents}
        places={places}
        placeId={placeId}
        onPlace={onPlace}
        onSelect={onSelect}
        compact
      />
      {!!state.projects.length && (
        <details>
          <summary>이곳의 프로젝트 · {state.projects.length}</summary>
          {state.projects.map((p) => (
            <p key={p.id}>
              {p.name} · {p.progress}%
            </p>
          ))}
        </details>
      )}
      {!!events.length && (
        <details>
          <summary>최근 이곳의 소식</summary>
          {events.map((e) => (
            <p key={e.id}>{e.text}</p>
          ))}
        </details>
      )}
    </aside>
  );
}
