import React, { useState } from 'react';
import { ACTIONS } from '../simulation/catalog.mjs';
import { formatDate, formatTime } from './format.mjs';
const inputNames = {
  from: '출발지',
  to: '목적지',
  durationSeconds: '수행 시간(초)',
  path: '이동 경로',
  placeId: '수행 장소',
  task: '작업 내용',
  resource: '생산 자원',
  amount: '생산량',
  foodCost: '식재료 수량',
  partnerId: '대화 상대',
  topic: '대화 주제',
  floor: '탐험 층',
  monsterId: '조우 상대',
  retreatHpRatio: '귀환 체력 기준',
  destination: '탐험 목적지',
  timeLimitMinutes: '제한 시간(분)',
  maxEncounters: '최대 조우 횟수',
  returnTo: '귀환지',
};
export default function LifeTimeline({ life, playback, history, selected, onRecord }) {
  const [logsOpen, setLogsOpen] = useState(false),
    [rulesOpen, setRulesOpen] = useState(false);
  const state = playback.state || life;
  const logs = state.logs
    .filter((r) => !selected || r.actorId === selected)
    .slice(-25)
    .reverse();
  return (
    <section className="life-timeline" aria-label="주민 일상 재생">
      <div className="timeline-heading">
        <div>
          <b>{playback.replay ? '저장된 일상 재생' : '자동으로 이어지는 일상'}</b>
          <small>
            {playback.replay
              ? formatDate(new Date(playback.time).toISOString())
              : '마지막 저장 ' + formatDate(life.updatedAt)}
          </small>
        </div>
        <button onClick={playback.live} aria-pressed={!playback.replay}>
          현재 보기
        </button>
      </div>
      <div className="timeline-controls">
        <button
          onClick={playback.playing ? playback.pause : playback.play}
          disabled={playback.begin >= playback.end}
        >
          {playback.playing ? '일시정지' : '▶ 일상 재생'}
        </button>
        <label>
          <span className="sr-only">재생 배속</span>
          <select
            aria-label="재생 배속"
            value={playback.speed}
            onChange={(e) => playback.setSpeed(Number(e.target.value))}
          >
            {[1, 10, 30, 60, 120].map((s) => (
              <option key={s} value={s}>
                {s}배속
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">저장된 날짜</span>
          <select
            aria-label="저장된 날짜"
            value={
              history.find(
                (h) => playback.state?.replayStartsAt === h.startsAt && playback.state !== life,
              )?.day || ''
            }
            onChange={(e) => playback.archive(history.find((h) => h.day === e.target.value))}
          >
            <option value="">최근 일상</option>
            {history.map((h) => (
              <option key={h.day} value={h.day}>
                {h.day} 기록
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="timeline-slider">
        <span>{formatTime(new Date(playback.begin).toISOString())}</span>
        <input
          aria-label="일상 재생 시각"
          type="range"
          min={playback.begin}
          max={Math.max(playback.begin, playback.end)}
          step="1000"
          value={playback.replay ? playback.time : playback.end}
          onChange={(e) => playback.seek(Number(e.target.value))}
          disabled={playback.begin >= playback.end}
        />
        <span>{formatTime(new Date(playback.end).toISOString())}</span>
      </label>
      {playback.loading && <p role="status">저장된 일상을 여는 중…</p>}
      {playback.error && <p role="alert">{playback.error}</p>}
      {!logs.length && (
        <p className="muted">
          주민들이 첫 행동을 수행 중이에요. 완료된 행동부터 재생 기록이 쌓입니다.
        </p>
      )}
      <details onToggle={(e) => setLogsOpen(e.currentTarget.open)}>
        <summary>
          실제 액션 로그 · {logs.length}
          {selected ? '개 · 선택한 주민' : '개 · 최근 기록'}
        </summary>
        {logsOpen && (
          <div className="action-log-list">
            {logs.map((record) => (
              <article key={record.id}>
                <button onClick={() => onRecord(record)}>
                  <time>
                    {formatTime(record.startsAt)}–{formatTime(record.endsAt)}
                  </time>
                  <b>
                    {state.actors.find((a) => a.id === record.actorId)?.player.name} ·{' '}
                    {record.label}
                  </b>
                  <span>{record.result.summary}</span>
                  <small>여기서 재생 ↗</small>
                </button>
                <details>
                  <summary>입력값과 결과</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        id: record.id,
                        parentId: record.parentId,
                        params: record.params,
                        result: record.result,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        )}
      </details>
      <details onToggle={(e) => setRulesOpen(e.currentTarget.open)}>
        <summary>주민이 선택할 수 있는 액션</summary>
        {rulesOpen && (
          <div className="action-catalog">
            {Object.entries(ACTIONS).map(([id, action]) => (
              <article key={id}>
                <h3>{action.name}</h3>
                <small>
                  {action.composite
                    ? '여러 단계를 연결한 행동'
                    : action.duration.join('–') + '분 · 기본 범위'}
                </small>
                <p>입력: {action.inputs.map((key) => inputNames[key] || key).join(', ')}</p>
              </article>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
