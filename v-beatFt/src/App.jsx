// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/mainpage/MainPage';
import GamePlay from './pages/gameplay/GamePlay';
import Result from './pages/gameplay/Result';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/main" element={<MainPage />} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
