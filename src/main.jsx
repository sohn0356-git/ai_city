import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { app, firebaseError, missingFirebaseKeys } from './firebase';
import './style.css';

function App() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  useEffect(() => {
    const prompt = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const complete = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', complete); };
  }, []);
  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  const ready = app && !firebaseError;
  return <main>
    <header><a href={import.meta.env.BASE_URL} className="brand">AI CITY<span>WEB GAME</span></a><span className="badge">FOUNDATION / 01</span></header>
    <section className="hero"><p className="eyebrow">A NEW CITY STARTS HERE</p><h1>새로운 도시의<br/><em>첫 번째 페이지.</em></h1><p className="intro">모바일과 웹에서 만나는 AI City.<br/>도시를 위한 기본 환경을 준비했어요.</p>
      <div className="city" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>
    </section>
    <section className="panel"><div><p className="eyebrow">PROJECT STATUS</p><h2>도시 기반 준비</h2></div><dl><div><dt>Firebase 설정</dt><dd className={ready ? 'ok' : 'pending'}>{ready ? 'SDK 초기화 완료' : '설정 확인 필요'}</dd></div><div><dt>게임 콘텐츠</dt><dd>개발 준비 중</dd></div><div><dt>모바일 앱</dt><dd>{installed ? '설치됨' : 'PWA 지원'}</dd></div></dl>
      {missingFirebaseKeys.length > 0 && <p className="notice">Firebase 환경변수가 아직 반영되지 않았어요. 관리자에게 배포 설정 확인을 요청해 주세요.</p>}
      {firebaseError && <p className="notice">Firebase 초기화에 실패했어요. 프로젝트 설정을 확인해 주세요.</p>}
      <p className="note">Firebase 표시는 SDK 설정 상태입니다. 로그인 및 데이터 읽기·쓰기는 아직 구현되지 않았어요.</p>
      {!installed && (installPrompt ? <button onClick={install}>홈 화면에 설치하기 ↗</button> : <p className="note">모바일 브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.</p>)}
    </section><footer>AI CITY · YOUR NEXT WORLD</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch((error) => console.error('PWA registration failed', error));
  });
}
