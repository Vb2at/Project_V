export default function Background() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: `
          linear-gradient(
            180deg,
            #5e0000ff 0%,
            #000000ff 55%,
            #004750ff 100%
          )
        `,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
