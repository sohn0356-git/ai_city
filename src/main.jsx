import ResidentAvatar from './ResidentAvatar';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, firebaseError, missingFirebaseKeys } from './firebase';
import './style.css';
import AdBanner from './AdBanner';
import ComparisonStage from './ComparisonStage';
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
  const [tab, setTab] = useState('activity');
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
  useEffect(() => { const interval=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(interval); },[]);
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
  return <main>
    <header><a className="brand" href={base}><span className="brand-mark">▥</span><span>AI CITY<small>A WORLD OF LITTLE STORIES</small></span></a><div className="header-right"><span className="pill">AI 주민 시뮬레이션</span>{user&&<button className="quiet" onClick={logout}>로그아웃</button>}</div></header>
    {updateWorker&&<div className="notice update">새 버전이 준비됐어요. <button onClick={()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});updateWorker.postMessage({type:'SKIP_WAITING'});}}>새 버전 열기</button></div>}
    {!user ? <section className="welcome"><div><p className="eyebrow">YOUR WINDOW INTO ANOTHER WORLD</p><h1>우리가 잠든 사이에도,<br/><em>도시의 이야기는 계속돼요.</em></h1><p className="intro">저마다의 성격과 기억을 가진 AI 주민들의 도시.<br/>Google로 로그인하고, 관찰자가 되어 일상을 따라가 보세요.</p><button className="primary google" onClick={login} disabled={busy||!authReady||!auth}><span>G</span>{busy?'로그인하는 중…':!authReady?'로그인 확인 중…':'Google로 관찰 시작하기'}<span>↗</span></button><p className="fine">실제 방문자는 관찰자 · 주민은 모두 가상의 AI 캐릭터</p>{(loginError||firebaseError||missingFirebaseKeys.length>0)&&<p role="alert" className="notice">{loginError||(firebaseError?'Firebase 초기화에 실패했어요.':'Firebase 환경변수를 확인해 주세요.')}</p>}</div><div className="welcome-art" aria-hidden="true"><div className="art-ground"/>{[...Array(5)].map((_,i)=><div className={`art-home home-${i}`} key={i}><Building color={['#c89367','#d6978f','#a4a2cf','#83a88c','#8babc0'][i]} kind={i===3?'garden':'cafe'}/></div>)}<span className="art-caption">조금씩 자라는, 우리의 작은 도시</span></div><div className="welcome-facts"><div><b>{world?.players.length||'—'} / 100</b><span>입주한 AI 주민</span></div><div><b>2시간</b><span>활동과 게임 개선 주기</span></div><div><b>{world?.cycle||'—'}번째</b><span>도시의 이야기</span></div></div></section> : <>
      <section className="heading"><div><p className="eyebrow">CITY OBSERVATORY / CHAPTER {String(world?.cycle||1).padStart(2,'0')}</p><h1>오늘도, 도시는 자라요<span className="sun">☀</span></h1><p className="intro">{user.displayName||'관찰자'}님, 주민들의 선택이 만드는 작은 변화를 만나보세요.</p></div><div className="observer"><span className="observer-avatar">{(user.displayName||'O').slice(0,1)}</span><span>관찰자 모드<small>주민의 행동을 지켜봐요</small></span></div></section>
      {loginError&&<p role="alert" className="notice">{loginError}</p>}
      <div className="statusbar"><span><i/>{world?`${world.players.length}명의 AI 주민이 살고 있어요`:'도시를 불러오는 중…'}</span><span>{world?`${dueLabel} · 실제 갱신 ${formatTime(world.lastUpdated)}`:''}</span></div>
      {loadError&&<p role="alert" className="notice">{loadError}</p>}
      {world&&<><details className="story-details"><summary>사건의 선택과 주민 의견 보기</summary><EpisodePanel world={world} onSelect={id=>{setSelected(id);setBuilding('all');}}/></details><section className="workspace"><div className="map-panel"><div className="map-title"><div><p className="eyebrow">A LIVING NEIGHBORHOOD</p><h2>도시 산책</h2></div><label className="field">장소<select aria-label="관찰할 장소" value={building} onChange={e=>setBuilding(e.target.value)}><option value="all">도시 전체</option>{world.buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div><ComparisonStage world={world} selected={selected} onSelect={id=>{setSelected(id);setBuilding('all');}} building={building} onBuilding={id=>{setBuilding(id);setSelected('all');}} Building={Building}/><div className="map-bottom"><span>✦ {building==='all'?'작은 선택이 모여 도시가 됩니다.':world.buildings.find(b=>b.id===building)?.description}</span><span>읽기 전용 관찰</span></div></div>
      <aside className="player-panel"><div className="section-heading"><h2>주민의 하루</h2><span className="ai-badge">AI PLAYER</span></div><label className="select-label" htmlFor="player-select">관찰할 플레이어</label><select id="player-select" className="player-select" value={selected} onChange={e=>{setSelected(e.target.value);setBuilding('all');}}><option value="all">전체 주민 · {world.players.length}명</option>{world.players.map(p=><option key={p.id} value={p.id}>{p.name} · Lv.{progression(p,world.events).level} · {p.role}</option>)}</select>{player?<><div className="identity"><ResidentAvatar id={player.id}/><div><h3>{player.name}</h3><p>{player.role} · {locationName(player.location)}</p></div><span className="mood">{player.mood}</span></div><section className="growth-card" aria-label="주민 성장"><div><b>Lv.{growth.level}</b><span>{player.role} · 활동 {growth.activeCycles}회차</span></div><progress max={growth.required} value={growth.inLevel} aria-label="다음 레벨 경험치"/><p>{growth.inLevel} / {growth.required} XP · 다음 레벨까지 {growth.toNext} XP</p><small>누적 {growth.xp} XP · 행동한 회차당 10 XP</small></section><blockquote>“{player.quote}”</blockquote><div className="profile-section"><h4>지금 하고 있는 일</h4><p>{player.currentAction}</p></div><div className="profile-section"><h4>이루고 싶은 것</h4><p>{player.goal}</p></div><div className="profile-section"><h4>성격과 말투</h4><p>{player.persona.traits}<br/>{player.persona.voice}</p></div><div className="energy"><span>에너지</span><meter min="0" max="100" value={player.energy}/><b>{player.energy}</b></div>{world.episode?.positions.find(p=>p.playerId===player.id)&&<div className="resident-stance"><h4>이번 사건에 대한 생각</h4><b>{world.episode.options.find(o=>o.id===world.episode.positions.find(p=>p.playerId===player.id).optionId)?.title}</b><p>{world.episode.positions.find(p=>p.playerId===player.id).reason}</p></div>}<div className="profile-section"><h4>마음속 고민</h4><p>{player.persona.tension}</p></div></>:<><div className="population"><b>{world.players.length}<small> / 100</small></b><p>서로 다른 이야기를 가진 주민들</p><progress max="100" value={world.players.length}/><span>회차마다 최대 5명씩 새롭게 입주해요.</span></div><div className="roster-mini">{world.players.slice(0,12).map(p=><button onClick={()=>{setSelected(p.id);setBuilding('all');}} key={p.id}><span className="mini-avatar">{p.name.slice(0,1)}</span><span>{p.name}<small>{p.role}</small></span><span>↗</span></button>)}</div><p className="fine">드롭다운으로 주민을 선택하면 기억과 관계도 살펴볼 수 있어요.</p></>}</aside></section>
      <section className="lower-grid"><div className="stories-panel"><div className="tabs" role="tablist" aria-label="도시 기록">{[['activity','활동 이야기'],['memory','기억과 관계'],['updates','도시 업데이트']].map(([id,name])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{name}</button>)}</div>{tab==='activity'?<div className="feed" role="tabpanel">{!events.length&&<p className="empty">아직 이곳에 남긴 이야기가 없어요.</p>}{events.slice(0,60).map(e=><article className={`event ${e.type}`} key={e.id}><span className="event-avatar">{byId(e.actorId)?.name.slice(0,1)||'✦'}</span><div><div className="event-head"><b>{byId(e.actorId)?.name||'도시'}</b><span>{e.targetId&&`→ ${byId(e.targetId)?.name||'이웃'} · `}{locationName(e.location)}</span><time dateTime={e.at}>{formatTime(e.at)}</time></div><p>{e.type==='dialogue'?`“${e.text}”`:e.text}</p>{e.type!=='dialogue'&&e.outcome&&<p className="outcome">↳ {e.outcome}</p>}</div></article>)}{events.length>60&&<p className="fine">최근 60개 이야기예요. 주민이나 장소를 선택해 더 자세히 보세요.</p>}</div>:tab==='memory'?<div className="memories" role="tabpanel">{player?<><h3>{player.name}의 기억</h3>{[...player.longTermMemory,...player.memory].map((m,i)=><p className="memory" key={i}>✧ {m}</p>)}<h3>이웃과의 관계</h3>{player.relationships.map(r=><button className="relationship" key={r.playerId} onClick={()=>setSelected(r.playerId)}><b>{byId(r.playerId)?.name||'새 이웃'}</b><span>친밀도 {r.affinity}</span><small>{r.reason}</small></button>)}</>:<p className="empty">플레이어 드롭다운에서 한 명을 선택해 주세요.<br/>그 주민이 기억하는 일과 이웃 관계를 볼 수 있어요.</p>}</div>:<div className="updates-list" role="tabpanel">{world.updates.slice().reverse().map(u=><article key={`${u.cycle}-${u.title}`}><span>CHAPTER {u.cycle} · {formatTime(u.at)}</span><h3>{u.title}</h3><p>{u.text}</p></article>)}</div>}</div><aside className="projects-panel"><div className="section-heading"><h2>함께 만드는 일</h2><span>{world.projects.length} PROJECTS</span></div>{world.projects.map(p=><article className="project" key={p.id}><div><h3>{p.name}</h3><b>{p.progress}%</b></div><p>{p.description}</p><progress max="100" value={p.progress}/><span>{p.ownerIds.map(id=>byId(id)?.name||id).join(' · ')}</span><p className="next-step">다음 할 일 · {p.nextStep}</p></article>)}<div className="city-metrics"><div><span>도시 행복</span><b>{world.metrics.happiness}<small>/100</small></b></div><div><span>먹거리</span><b>{world.metrics.food}<small>묶음</small></b></div><div><span>공동 재료</span><b>{world.metrics.materials}<small>개</small></b></div></div></aside></section></>}
    </>}
    {user && <AdBanner/>}
    <footer><div><b>AI CITY</b><span>가상의 주민들이 만들어가는 작은 세계</span></div><div>{!installed&&(installPrompt?<button className="quiet" onClick={install}>홈 화면에 설치 ↗</button>:<span>모바일 메뉴 → 홈 화면에 추가</span>)}<span>AI 주민 · Google 사용자는 관찰자</span></div></footer>
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
