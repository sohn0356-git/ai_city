import React, { lazy, Suspense, useState } from 'react';
import { formatTime } from './format.mjs';
const BattleReplay = lazy(() => import('../BattleReplay'));
const WalletPanel = lazy(() => import('../WalletPanel'));
const EssencePanel = lazy(() => import('../EssencePanel'));
const LifeActionDetails = lazy(() => import('./LifeActionDetails'));
const MonsterBook = lazy(() => import('../MonsterBook'));

export default function ResidentDetails({ world, player, now, onSelect }) {
  const [tab, setTab] = useState('schedule');
  const plans = [...(world.activityPlans || []), ...(world.queuedActivityPlans || [])].filter(
    (p) => p.playerId === player.id,
  );
  return (
    <section className="resident-details">
      <div className="sub-navigation" aria-label="주민 상세 종류">
        {[
          ['schedule', '일정'],
          ['memory', '기억·관계'],
          ['adventure', '탐험'],
          ['bag', '소지품'],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'schedule' && world.lifeActivities && (
        <Suspense fallback={<p>액션 기록을 여는 중…</p>}>
          <LifeActionDetails player={player} world={world} />
        </Suspense>
      )}
      {tab === 'schedule' && !world.lifeActivities && (
        <>
          {plans.map((plan) => (
            <article className="schedule-card" key={plan.id}>
              <h4>
                {formatTime(plan.startsAt)}–{formatTime(plan.endsAt)}{' '}
                <span>
                  {now < Date.parse(plan.startsAt)
                    ? '예약'
                    : now < Date.parse(plan.endsAt)
                      ? '진행 중'
                      : plan.status === 'settled'
                        ? '정산 완료'
                        : '결과 확인 대기'}
                </span>
              </h4>
              {plan.steps ? (
                <ol>
                  {plan.steps.map((step, i) => (
                    <li
                      key={i}
                      className={
                        now >= Date.parse(step.startsAt) && now < Date.parse(step.endsAt)
                          ? 'current-step'
                          : ''
                      }
                    >
                      <time>{formatTime(step.startsAt)}</time>
                      <span>{step.label}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>이전 방식으로 저장된 일정입니다.</p>
              )}
            </article>
          ))}
          {!plans.length && <p>저장된 일정이 없어요.</p>}
          <p className="muted">시간 경과만으로 생산·전투 결과가 확정되지는 않아요.</p>
        </>
      )}
      {tab === 'memory' && (
        <>
          <h4>이루고 싶은 것</h4>
          <p>{player.goal}</p>
          <blockquote>“{player.quote}”</blockquote>
          <h4>최근 기억</h4>
          {(player.memory || [])
            .slice(-5)
            .reverse()
            .map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          <details>
            <summary>오래 기억하는 일</summary>
            {(player.longTermMemory || []).map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </details>
          <h4>이웃과의 관계</h4>
          {player.relationships.map((r) => (
            <button className="relationship" key={r.playerId} onClick={() => onSelect(r.playerId)}>
              <b>{world.players.find((p) => p.id === r.playerId)?.name || '이웃'}</b>
              <span>{r.affinity}</span>
              <small>{r.reason}</small>
            </button>
          ))}
        </>
      )}
      <Suspense fallback={<p role="status">기록을 여는 중…</p>}>
        {tab === 'adventure' && (
          <>
            <BattleReplay world={world} selected={player.id} />
            <MonsterBook world={world} selected={player.id} />
          </>
        )}
        {tab === 'bag' && (
          <>
            <WalletPanel world={world} selected={player.id} />
            <EssencePanel world={world} selected={player.id} />
          </>
        )}
      </Suspense>
    </section>
  );
}
