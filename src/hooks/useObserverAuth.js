import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, firebaseError, missingFirebaseKeys } from '../firebase';

const messages = {
  'auth/unauthorized-domain':
    '이 주소의 Google 로그인이 허용되지 않았어요. Firebase 승인 도메인을 확인해 주세요.',
  'auth/operation-not-allowed': 'Google 로그인 제공자 설정을 확인해 주세요.',
  'auth/popup-blocked': '팝업을 허용한 뒤 다시 눌러 주세요.',
  'auth/popup-closed-by-user': '로그인이 취소됐어요.',
  'auth/cancelled-popup-request': '다른 로그인 창에서 진행해 주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해 주세요.',
  'auth/web-storage-unsupported': '일반 Chrome 또는 Safari에서 열어 주세요.',
};
export default function useObserverAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!auth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signingIn = useRef(false);
  useEffect(() => {
    if (!auth) return;
    setSlow(false);
    const timeout = setTimeout(() => setSlow(true), 15000);
    const stop = onAuthStateChanged(
      auth,
      (value) => {
        clearTimeout(timeout);
        setSlow(false);
        setUser(value);
        setReady(true);
      },
      () => {
        clearTimeout(timeout);
        setReady(true);
        setError('로그인 상태 확인에 실패했어요. 다시 연결해 주세요.');
      },
    );
    return () => {
      clearTimeout(timeout);
      stop();
    };
  }, [attempt]);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [busy]);
  async function login() {
    if (!auth || signingIn.current) return;
    signingIn.current = true;
    setBusy(true);
    setSlow(false);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError(messages[error.code] || '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      signingIn.current = false;
      setBusy(false);
      setSlow(false);
    }
  }
  async function logout() {
    try {
      await signOut(auth);
    } catch {
      setError('로그아웃하지 못했어요. 다시 시도해 주세요.');
    }
  }
  return {
    user,
    ready,
    busy,
    slow,
    login,
    logout,
    retry: () => {
      setError('');
      setAttempt((n) => n + 1);
    },
    available: Boolean(auth),
    error:
      error || (firebaseError || missingFirebaseKeys.length ? '로그인 설정을 확인해 주세요.' : ''),
  };
}
