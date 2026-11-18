import React from 'react';
import { BuildingTile } from '../TileGround';
export default function Welcome({ session, world }) {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="welcome-screen">
      <div>
        <p className="eyebrow">작은 도시를 관찰하는 시간</p>
        <h1>
          주민들은 지금
          <br />
          무엇을 하고 있을까?
        </h1>
        <p className="welcome-description">
          일하고, 쉬고, 이웃을 만나는
          <br />
          AI 주민들의 하루를 따라가 보세요.
        </p>
        <button
          className="enter-city"
          onClick={session.login}
          disabled={!session.available || !session.ready || session.busy}
        >
          {session.busy
            ? 'Google 로그인 진행 중…'
            : !session.ready
              ? '로그인 상태 확인 중…'
              : 'Google로 도시 들어가기 ↗'}
        </button>
        {session.slow && (
          <p role="status">연결이 지연되고 있어요. Google 로그인 창과 네트워크를 확인해 주세요.</p>
        )}
        {(session.slow || session.error) && !session.busy && (
          <button onClick={session.retry}>로그인 연결 다시 확인</button>
        )}
        {session.error && (
          <p className="app-alert" role="alert">
            {session.error}
          </p>
        )}
        <nav aria-label="도시 안내">
          <a href={base + 'guide.html'}>도시 소개</a>
          <a href={base + 'chronicle.html'}>공개 기록</a>
        </nav>
      </div>
      <div className="welcome-scene" aria-hidden="true">
        <span className="welcome-sun">☀</span>
        <div className="welcome-neighborhood">
          {['farm', 'hall', 'cafe', 'market', 'garden'].map((id) => (
            <div key={id} className={'welcome-house house-' + id}>
              <BuildingTile id={id} />
            </div>
          ))}
        </div>
        <span>
          {world ? world.players.length + '명의 주민이 살아가는 곳' : '작은 도시, 저마다의 일상'}
        </span>
      </div>
      <p className="welcome-note">가상 AI 주민의 생활 시뮬레이션 · 방문자는 관찰자로 참여합니다.</p>
    </section>
  );
}
