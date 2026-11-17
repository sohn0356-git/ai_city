import ResidentAvatar from './ResidentAvatar';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, firebaseError, missingFirebaseKeys } from './firebase';
import './style.css';
import AdBanner from './AdBanner';
import CityStage from './CityStage';
import {activityState} from './activity.mjs';
import EpisodePanel from './EpisodePanel';
import {progression} from './progression.mjs';

const base = import.meta.env.BASE_URL;
const formatTime = (time) => new Intl.DateTimeFormat('ko-KR', { month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul' }).format(new Date(time));
const errorMessages = {
  'auth/unauthorized-domain': 'Firebase Authentication의 승인 도메인에 sohn0356-git.github.io를 추가해 주세요.',
  'auth/operation-not-allowed': 'Firebase 콘솔 → Authentication → 로그인 방법에서 Google을 사용 설정해 주세요.',
  'auth/popup-blocked': '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.',
  'auth/popup-closed-by-user': '로그인을 취소했어요. 원할 때 다시 시작할 수 있어요.',
  'auth/network-request-failed': '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  'auth/web-storage-unsupported': '이 브라우저의 저장 공간을 사용할 수 없어요. 일반 Chrome 또는 Safari에서 열어 주세요.',
};
function Building({ color, kind }) {
  const greenery = kind === 'garden' || kind === 'farm';
  return <svg viewBox="0 0 120 106" aria-hidden="true"><ellipse cx="61" cy="91" rx="48" ry="12" fill="#385b4930"/>{greenery ? <><path d="M13 73 57 49 108 74 64 100Z" fill="#97b479"/><path d="M27 77 66 55M41 86 80 64M58 93 95 72" stroke="#d1d9a1" strokeWidth="5"/><path d="M55 59V35" stroke="#7d7650" strokeWidth="6"/><circle cx="55" cy="29" r="22" fill={color}/><circle cx="42" cy="39" r="15" fill="#b6c998"/><circle cx="73" cy="39" r="16" fill="#719b76"/></> : <><path d="M19 42 61 20 103 42V83L61 104 19 83Z" fill={color}/><path d="M61 63 103 42V83L61 104Z" fill="#000" opacity=".13"/><path d="M19 42 61 18 103 42 61 66Z" fill="#f4e0bf"/><path d="M13 41 61 12 109 41 61 68Z" fill={color}/><path d="M31 60v15m16-7v15m28-15v15m15-23v15" stroke="#fff4d3" strokeWidth="7"/><path d="M54 100V82l9-5v27" fill="#5b6866"/>{kind==='cafe' && <path d="M16 53 59 77 59 84 16 60Z" fill="#fff1dd"/>}</>}</svg>;
}
function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [world, setWorld] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState('all');
  const [building, setBuilding] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
  const [updateWorker, setUpdateWorker] = useState(null);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (value) => { setUser(value); setAuthReady(true); }, () => { setAuthReady(true); setLoginError('로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.'); });
  }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`${base}world.json`, {cache:'no-store'});
        if (!response.ok) throw new Error('세계 데이터를 불러오지 못했어요.');
        const value = await response.json();
        if (value.schemaVersion !== 1 || !Array.isArray(value.players) || !Array.isArray(value.events) || !Array.isArray(value.buildings) || !value.players.length) throw new Error('세계 데이터 형식을 확인해야 해요.');
        if (alive) {setWorld(value);setLoadError('');}
      } catch { if (alive) setLoadError('새 활동을 가져오지 못했어요. 연결을 확인하고 새로고침해 주세요.'); }
    };
    load();
    const interval = setInterval(load, 60000);
    const focus = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', focus);
    return () => {alive=false;clearInterval(interval);document.removeEventListener('visibilitychange',focus);};
  }, []);
  useEffect(() => { const interval=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(interval); },[]);
  useEffect(() => {
    const prompt = (event) => {event.preventDefault();setInstallPrompt(event);};
    const complete = () => {setInstalled(true);setInstallPrompt(null);};
    const update = (event) => setUpdateWorker(event.detail);
    window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',complete);window.addEventListener('city-update',update);
    return()=>{window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',complete);window.removeEventListener('city-update',update);};
  },[]);
  async function login() {
    if (!auth) {setLoginError('Firebase 설정을 확인해 주세요.');return;}
    setBusy(true);setLoginError('');
    try {const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}
    catch(error){setLoginError(errorMessages[error.code] || `Google 로그인에 실패했어요. (${error.code || 'unknown'})`);}
    finally{setBusy(false);}
  }
  async function logout() {try{await signOut(auth);}catch{setLoginError('로그아웃에 실패했어요. 다시 시도해 주세요.');}}
  async function install(){if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null);}
  const player=world?.players.find(p=>p.id===selected);
  const growth=player?progression(player,world.events):null;
  const byId=(id)=>world?.players.find(p=>p.id===id);
  const locationName=(id)=>world?.buildings.find(b=>b.id===id)?.name || id;
  const events=world?.events.filter(e=>(selected==='all'||e.actorId===selected||e.targetId===selected)&&(building==='all'||e.location===building)).slice().sort((a,b)=>new Date(b.at)-new Date(a.at))||[];
  const due=world && new Date(world.nextUpdateAt).getTime()-now;
  const dueLabel=due>0?`다음 회차 약 ${Math.ceil(due/60000)}분 후`:'다음 회차 갱신 대기';

  const follow = (id) => { setSelected(id); setBuilding('all'); };
  const residents = world?.players.filter(p => building === 'all' || p.location === building) || [];
  const activity = player && world ? activityState(player,world,now) : null;
  const phaseNames = {walking:'이동 중',working:'일하는 중',fighting:'탐험 중',resting:'쉬는 중'};
  const phase = (p) => {
    const state = activityState(p,world,now);
    return { label:state?.label || p.currentAction, tag:phaseNames[state?.kind] || '생활 중' };
  };
  return <main className="city-home">
    <header><a className="brand" href={base}><span className="brand-mark">▥</span><span>AI CITY<small>주민들의 하루</small></span></a><div className="header-right"><span className="pill">도시 관찰</span>{user&&<button className="quiet" onClick={logout}>로그아웃</button>}</div></header>
    {updateWorker&&<div className="notice update">새 화면이 준비됐어요. <button onClick={()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});updateWorker.postMessage({type:'SKIP_WAITING'});}}>새 버전 열기</button></div>}
    {!user ? <section className="welcome"><div><p className="eyebrow">AI CITY</p><h1>AI들은 지금<br/><em>무엇을 하고 있을까?</em></h1><p className="intro">일하고, 이웃을 만나고, 탐험하는 주민들의 하루.</p><button className="primary google" onClick={login} disabled={busy||!authReady||!auth}><span>G</span>{busy?'로그인하는 중…':!authReady?'로그인 확인 중…':'도시 들어가기'}<span>↗</span></button><nav className="public-links"><a href={base+'guide.html'}>도시 소개</a><a href={base+'chronicle.html'}>도시 기록</a><a href={base+'privacy.html'}>개인정보 안내</a></nav>{(loginError||firebaseError||missingFirebaseKeys.length>0)&&<p role="alert" className="notice">{loginError||'로그인 설정을 확인해 주세요.'}</p>}</div><div className="welcome-art" aria-hidden="true"><div className="art-ground"/>{[...Array(5)].map((_,i)=><div className={'art-home home-'+i} key={i}><Building color={['#c89367','#d6978f','#a4a2cf','#83a88c','#8babc0'][i]} kind={i===3?'garden':'cafe'}/></div>)}<span className="art-caption">작은 도시, 저마다의 일상</span></div><div className="welcome-facts"><div><b>{world?.players.length||'—'}명</b><span>AI 주민</span></div><div><b>{world?.buildings.length||'—'}곳</b><span>생활 공간</span></div><div><b>{world?.cycle||'—'}회차</b><span>이어지는 하루</span></div></div></section> : <>
      <section className="heading"><div><p className="eyebrow">CITY / {world?.cycle||'—'}</p><h1>지금, 우리 동네</h1><p className="intro">주민을 누르고 하루를 따라가 보세요.</p></div><span className="pill">{world?.players.length||'—'}명의 주민</span></section>
      {loginError&&<p role="alert" className="notice">{loginError}</p>}
      {loadError&&<p role="alert" className="notice">{loadError}</p>}
      {!world&&<p role="status" className="empty">도시를 불러오는 중…</p>}
      {world&&<>
        <div className="city-summary"><span>☀ 행복 <b>{world.metrics.happiness}</b></span><span>먹거리 <b>{world.metrics.food}</b></span><span>공동 재료 <b>{world.metrics.materials}</b></span><small>{dueLabel} · {formatTime(world.lastUpdated)} 기준</small></div>
        <section className="workspace"><div className="map-panel"><div className="map-title"><div><p className="eyebrow">동네 둘러보기</p><h2>{player?player.name+' 따라가는 중':'도시 지도'}</h2></div><label className="field">장소<select aria-label="관찰할 장소" value={building} onChange={e=>{setBuilding(e.target.value);setSelected('all');}}><option value="all">도시 전체</option>{world.buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
        <CityStage world={world} selected={selected} onSelect={follow} building={building} onBuilding={id=>{setBuilding(id);setSelected('all');}}/>
        </div>
        <aside className="player-panel"><div className="section-heading"><h2>{player?'주민 따라보기':'주민들은 지금'}</h2>{player&&<button className="quiet" onClick={()=>follow('all')}>전체 보기</button>}</div>
          <label className="select-label" htmlFor="player-select">주민 선택</label><select id="player-select" className="player-select" value={selected} onChange={e=>follow(e.target.value)}><option value="all">전체 주민</option>{world.players.map(p=><option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}</select>
          {player?<><div className="identity"><ResidentAvatar id={player.id}/><div><h3>{player.name}</h3><p>{player.role} · Lv.{growth.level}</p></div><span className="mood">{player.mood}</span></div>
            <div className="doing-now"><span>{phase(player).tag}</span><h3>{activity?.label||player.currentAction}</h3><p>{'생활 거점 · '+locationName(player.location)}</p>{activity&&<progress aria-label="현재 활동 진행" max="1" value={activity.progress}/>}</div>
            <div className="energy"><span>에너지</span><meter min="0" max="100" value={player.energy}/><b>{player.energy}</b></div>
            <details className="life-details"><summary>이 주민 알아보기</summary><p>{player.goal}</p><blockquote>“{player.quote}”</blockquote><p>{player.persona?.traits}</p><h4>최근 기억</h4>{[...(player.longTermMemory||[]),...(player.memory||[])].slice(-4).map((m,i)=><p key={i}>{m}</p>)}<h4>이웃 관계</h4>{player.relationships?.map(r=><button className="relationship" key={r.playerId} onClick={()=>follow(r.playerId)}><b>{byId(r.playerId)?.name||'이웃'}</b><span>친밀도 {r.affinity}</span><small>{r.reason}</small></button>)}</details>
          </>:<div className="resident-life-list">{residents.map(p=>{const state=phase(p);return <button key={p.id} className="resident-life" onClick={()=>follow(p.id)}><ResidentAvatar id={p.id}/><span><b>{p.name}<small>{state.tag}</small></b><span className="resident-task">{state.label}</span></span><span aria-hidden="true">↗</span></button>;})}{!residents.length&&<p className="empty">이곳에 머무는 주민이 없어요.</p>}</div>}
        </aside></section>
        <section className="life-news"><div className="section-heading"><h2>{player?player.name+'의 최근 소식':'동네에서 있었던 일'}</h2><span>최근 기록</span></div>
          {!events.length&&<p className="empty">아직 소식이 없어요.</p>}
          {events.slice(0,showAll?30:5).map(e=><details className="news-item" key={e.id}><summary><span className="news-who">{byId(e.actorId)?.name||'도시'}</span><span className="news-text">{e.text}</span><time dateTime={e.at}>{formatTime(e.at)}</time></summary><p>{e.text}</p>{e.outcome&&<p>{e.outcome}</p>}<small>{locationName(e.location)}{e.targetId?' · '+(byId(e.targetId)?.name||'이웃'):''}</small></details>)}
          {events.length>5&&<button className="quiet" onClick={()=>setShowAll(!showAll)}>{showAll?'접기':'소식 더 보기'}</button>}
        </section>
        <section className="city-drawers"><details className="life-details"><summary>함께 만드는 일 · {world.projects.length}</summary>{world.projects.map(p=><article className="project" key={p.id}><div><h3>{p.name}</h3><b>{p.progress}%</b></div><progress aria-label={p.name+' 진행률'} max="100" value={p.progress}/><details><summary>내용 보기</summary><p>{p.description}</p><p>{p.nextStep}</p><small>{p.ownerIds.map(id=>byId(id)?.name||id).join(' · ')}</small></details></article>)}</details>
        <details className="life-details"><summary>도시의 선택과 변화</summary><EpisodePanel world={world} onSelect={follow}/>{world.updates.slice(-3).reverse().map(u=><article className="project" key={u.cycle+'-'+u.title}><h3>{u.title}</h3><p>{u.text}</p></article>)}</details></section>
      </>}
    </>}
    <AdBanner/>
    <footer><div><b>AI CITY</b><span>가상 AI 주민의 일상</span></div><div>{!installed&&installPrompt&&<button className="quiet" onClick={install}>홈 화면에 설치 ↗</button>}<a href={base+'privacy.html'}>개인정보 안내</a></div></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration=await navigator.serviceWorker.register(`${base}sw.js`,{scope:base});
      const announce=()=>{if(registration.waiting)window.dispatchEvent(new CustomEvent('city-update',{detail:registration.waiting}));};
      announce();registration.addEventListener('updatefound',()=>{const installing=registration.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)announce();});});
      setInterval(()=>registration.update().catch(()=>{}), 5*60*1000);
    } catch(error){console.error('PWA registration failed',error);}
  });
}
