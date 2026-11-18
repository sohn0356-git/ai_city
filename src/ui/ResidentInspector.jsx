import React, { lazy, Suspense, useState } from 'react';
import ResidentAvatar from '../ResidentAvatar';
import { combatStats, progression } from '../progression.mjs';
import { formatTime } from './format.mjs';
const ResidentDetails = lazy(() => import('./ResidentDetails'));

export default function ResidentInspector({ resident, world, onClose, onSelect, now }) {
  const [expanded, setExpanded] = useState(false);
  const { player, activity } = resident;
  const growth = progression(player, world.events);
  return (
    <aside className="resident-inspector">
      <div className="panel-title">
        <h2>따라보는 주민</h2>
        <button onClick={onClose} aria-label="주민 선택 해제">
          닫기 ×
        </button>
      </div>
      <div className="resident-profile">
        <ResidentAvatar id={player.id} />
        <div>
          <h3>{player.name}</h3>
          <p>
            {player.role} · Lv.{growth.level}
          </p>
        </div>
        <span className="status-chip">{player.mood}</span>
      </div>
      <section className="current-activity">
        <span className="status-chip">{resident.phase}</span>
        <h3>{resident.summary}</h3>
        {resident.summary !== resident.label && (
          <details className="activity-description">
            <summary>활동 내용</summary>
            <p>{resident.label}</p>
          </details>
        )}
        <p>{resident.location}</p>
        {activity && !resident.waiting && (
          <>
            <progress max="1" value={activity.progress} aria-label="현재 단계 진행률" />
            {activity.step && (
              <small>
                {formatTime(activity.step.endsAt)}까지 ·{' '}
                {world.lifeActivities ? '자동 액션 진행' : '저장된 일정 기준'}
              </small>
            )}
          </>
        )}
        {resident.waiting && (
          <small>일정 시간이 끝났어요. 실제 결과는 다음 세계 갱신에서 확인합니다.</small>
        )}
      </section>
      <div className="resident-vitals">
        {player.hp !== undefined && (
          <label>
            체력 <meter min="0" max={combatStats(player).maxHp} value={player.hp} />
            <b>
              {player.hp}/{combatStats(player).maxHp}
            </b>
          </label>
        )}
        {player.hunger !== undefined && (
          <label>
            허기 <meter min="0" max="100" low="40" high="75" optimum="20" value={player.hunger} />
            <b>{player.hunger}</b>
          </label>
        )}
        <label>
          에너지 <meter min="0" max="100" value={player.energy} />
          <b>{player.energy}</b>
        </label>
        <label>
          성장 <progress max={growth.required} value={growth.inLevel} />
          <b>
            {growth.inLevel}/{growth.required} XP
          </b>
        </label>
      </div>
      <button
        className="detail-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '상세 접기 −' : '일정 · 기억 · 탐험 기록 +'}
      </button>
      {expanded && (
        <Suspense fallback={<p role="status">주민 기록을 여는 중…</p>}>
          <ResidentDetails world={world} player={player} now={now} onSelect={onSelect} />
        </Suspense>
      )}
    </aside>
  );
}
