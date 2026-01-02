// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GamePlay from './pages/gameplay/GamePlay';
import Result from './pages/gameplay/Result';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/game/play" element={<GamePlay />} />
        <Route path="/game/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
