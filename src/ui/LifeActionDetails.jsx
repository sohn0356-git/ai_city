import React from 'react';
import { formatDate, formatTime } from './format.mjs';
export default function LifeActionDetails({ player, world }) {
  const action = player.lifeAction;
  const logs = (world.lifeLogs || [])
    .filter((r) => r.actorId === player.id)
    .slice(-8)
    .reverse();
  const name = (id) =>
    world.buildings.find((p) => p.id === id)?.name || (id === 'dungeon' ? '메아리 동굴' : id);
  return (
    <section className="life-action-details">
      <h4>현재 액션</h4>
      {action ? (
        <>
          <h3>{action.label}</h3>
          <p>
            {formatTime(action.startsAt)}–{formatTime(action.endsAt)} ·{' '}
            {action.params.durationSeconds}초
          </p>
          {action.type === 'move' && (
            <p>
              {name(action.params.from)} → {name(action.params.to)}
            </p>
          )}
          {action.parentId && (
            <p className="muted">탐험의 한 단계 · 체력·시간 제한을 확인하며 진행합니다.</p>
          )}
          <details>
            <summary>입력값 보기</summary>
            <pre>{JSON.stringify(action.params, null, 2)}</pre>
          </details>
        </>
      ) : (
        <p>다음 행동을 준비 중이에요.</p>
      )}
      <h4>실제로 마친 행동</h4>
      {logs.map((log) => (
        <details key={log.id}>
          <summary>{log.result.summary}</summary>
          <p>
            {formatDate(log.startsAt)}–{formatTime(log.endsAt)}
          </p>
          <p>{log.reason}</p>
          {log.result.lines?.map((line, i) => (
            <p key={i}>
              {world.players.find((p) => p.id === line.speakerId)?.name} · “{line.text}”
            </p>
          ))}
          <pre>{JSON.stringify(log.params, null, 2)}</pre>
        </details>
      ))}
      {!logs.length && <p>첫 행동을 수행 중이에요.</p>}
    </section>
  );
}
