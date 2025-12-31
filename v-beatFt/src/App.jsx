// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GamePlay from './pages/gameplay/GamePlay';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/game/play" element={<GamePlay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
