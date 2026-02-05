// src/App.jsx
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { statusApi, logoutApi } from './api/auth';
import Header from './components/Common/Header';

import Login from './pages/member/Login';
import MainPage from './pages/mainpage/MainPage';
import GamePlay from './pages/gameplay/GamePlay';
import Result from './pages/gameplay/Result';
import Join from './pages/member/Join';
import StartPage from './pages/StartPage';
import MyPage from './pages/mypage/Mypage';
import './index.css';
import NavLoading from './pages/member/NavLoading';
import TermsPage from './pages/auth/TermsPage';
import SongUpload from './pages/songUpload/SongUpload';
import SongEditor from './pages/songUpload/SongEditor';
import NoteEditor from './pages/songUpload/NoteEditor';
import RePw from './pages/member/RePw';
import RoomLobby from './pages/multi/RoomLobby';
import LandingPage from './pages/LandingPage';
import InviteModal from './components/mulit/InviteModal';
import RefreshGuard from './components/Common/RefreshGuard';

// 로그인 필수 페이지용
function RequireAuth({ isLogin, children }) {
  const [alertDone, setAlertDone] = useState(false);

  useEffect(() => {
    if (isLogin === false && !alertDone) {
      alert("로그인 후 이용 가능한 서비스입니다.");
      setAlertDone(true);
    }
  }, [isLogin, alertDone]);

  if (isLogin === null) return null;
  if (!isLogin) return <Navigate to="/login" replace />;
  return children;
}

// 로그아웃 필수 페이지용
function RequireGuest({ isLogin, children }) {
  const [alertDone, setAlertDone] = useState(false);

  useEffect(() => {
    if (isLogin === true && !alertDone) {
      setAlertDone(true);
    }
  }, [isLogin, alertDone]);

  if (isLogin === null) return null;
  if (isLogin) return <Navigate to="/main" replace />;
  return children;
}

/* ===============================
   Router 안에서 모달 제어용
=============================== */
function AppInner() {
  const [invite, setInvite] = useState(null);
  const [isLogin, setIsLogin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onBack = () => {
      // 이미 메인이면 아무 것도 하지 않음
      if (window.location.pathname === '/main') {
        window.history.pushState(null, '', window.location.href);
        return;
      }

      alert('뒤로가기는 사용할 수 없습니다. 메인으로 이동합니다.');

      // 🔥 핵심 추가 — 뒤로가기 = 실제 퇴장 처리
      try {
        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('roomId');
        const isMulti = params.get('mode') === 'multi';

        if (isMulti && roomId) {
          window.dispatchEvent(
            new CustomEvent('multi:forceLeave', { detail: { roomId } })
          );
        }
      } catch { }

      navigate('/main', { replace: true });

      // 히스토리 기준점 재삽입
      window.history.pushState(null, '', window.location.href);
    };


    // 초기 기준점 확보
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', onBack);

    return () => {
      window.removeEventListener('popstate', onBack);
    };
  }, [navigate]);




  const handleLogout = async () => {
    try {
      await logoutApi();   // 서버 세션 제거
      setIsLogin(false);
      navigate('/login', { replace: true });
    } catch (err) {
      setIsLogin(false);
      navigate('/login');
    }

    setIsLogin(false);
  };

  useEffect(() => {
    statusApi()
      .then(res => {
        setIsLogin(res.data.ok === true);
      })
      .catch(() => {
        setIsLogin(false);
      });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setInvite(e.detail);
    };

    window.addEventListener('multi:invite', handler);
    return () => window.removeEventListener('multi:invite', handler);
  }, []);

  return (
    <>
      <RefreshGuard />
      {invite && (
        <InviteModal
          from={invite.from}
          onAccept={() => {
            setInvite(null);
            navigate(`/game/play?mode=multi&roomId=${invite.roomId}`);
          }}
          onReject={() => {
            setInvite(null);
          }}
        />
      )}
      <Routes>
        <Route path="/join" element={<RequireGuest isLogin={isLogin}><Join /></RequireGuest>} />
        <Route path="/re-password" element={<RequireGuest isLogin={isLogin}><RePw /></RequireGuest>} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/main" element={<MainPage onLogout={handleLogout} />} />
        <Route path="/multi/room/:roomId" element={<RequireAuth isLogin={isLogin}><RoomLobby /></RequireAuth>} />
        <Route path="/song/:songId/edit" element={<SongEditor />} />
        <Route path="/song/:songId/note/edit" element={<NoteEditor />} />
        <Route path="/song/:songId" element={<GamePlay />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/test" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
        <Route path="/nav-loading" element={<NavLoading />} />
        <Route path="/game/result-test-multi" element={<RequireAuth isLogin={isLogin}><Result /></RequireAuth>} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<RequireGuest isLogin={isLogin}><Login onLoginSuccess={() => setIsLogin(true)} /></RequireGuest>} />
        <Route path="/mypage" element={<RequireAuth isLogin={isLogin}><MyPage /></RequireAuth>} />
        <Route path="/song/upload" element={<RequireAuth isLogin={isLogin}><SongUpload /></RequireAuth>} />
      </Routes>

      <Header isLogin={isLogin} onLogout={handleLogout} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>

      <AppInner />
    </BrowserRouter>
  );
}
