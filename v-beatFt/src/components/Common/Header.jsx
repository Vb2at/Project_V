// GameHeader.jsx

function GameHeader({ isPlaying }) {
  return isPlaying ? <PlayingHeader /> : <BaseHeader />;
}

function BaseHeader() {
  return (
    <header>
      <div>{/* LEFT */}</div>
      <div>{/* CENTER */}</div>
      <div>{/* RIGHT */}</div>
    </header>
  );
}

function PlayingHeader() {
  return (
    <header>
      <div>{/* LEFT */}</div>
      <div>{/* CENTER */}</div>
      <div>{/* RIGHT */}</div>
    </header>
  );
}

export default GameHeader;
