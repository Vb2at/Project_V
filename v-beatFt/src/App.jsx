// src/App.jsx
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

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

/* ===============================
   Router 안에서 모달 제어용
=============================== */
function AppInner() {
  const [invite, setInvite] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      setInvite(e.detail);
    };

    window.addEventListener('multi:invite', handler);
    return () => window.removeEventListener('multi:invite', handler);
  }, []);

  return (
    <>
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
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/re-password" element={<RePw />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/multi/room/:roomId" element={<RoomLobby />} />
        <Route path="/song/upload" element={<SongUpload />} />
        <Route path="/song/:songId/edit" element={<SongEditor />} />
        <Route path="/song/:songId/note/edit" element={<NoteEditor />} />
        <Route path="/song/:songId" element={<GamePlay />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/test" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
        <Route path="/nav-loading" element={<NavLoading />} />
        <Route path="/game/result-test-multi" element={<Result />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
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
