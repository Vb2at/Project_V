// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/member/Login';
import MainPage from './pages/mainpage/MainPage';
import GamePlay from './pages/gameplay/GamePlay';
import Result from './pages/gameplay/Result';
import Join from './pages/member/Join';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
