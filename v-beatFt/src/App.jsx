// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import SongUpload from './pages/SongUpload';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/start" element={<StartPage/>} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/mypage" element= {<MyPage/>} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/song/upload" element= {<SongUpload/>} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
        <Route path="/nav-loading" element={<NavLoading />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
