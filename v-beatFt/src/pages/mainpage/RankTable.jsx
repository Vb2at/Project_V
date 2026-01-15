export default function RankTable({ rankings = [], loading = false }) {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontWeight: 700, letterSpacing: '0.08em' }}>
                랭킹
            </div>

            {/* Column Title */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1.0fr 1.2fr .9fr .8fr 1fr',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#ffb3b3',
                    padding: '6px 8px',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
            >
                <div />
                <div>NAME</div>
                <div style={{ textAlign: 'right' }}>SCORE</div>
                <div style={{ textAlign: 'center' }}>ACC</div>
                <div style={{ textAlign: 'center' }}>GRADE</div>
                <div style={{ textAlign: 'right' }}>COMBO</div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && <div style={{ padding: 12 }}>Loading...</div>}

                {!loading && rankings.length === 0 && (
                    <div style={{ padding: 12, opacity: 0.6 }}>No Records</div>
                )}

                {!loading &&
                    rankings.slice(0, 100).map((r, i) => {
                        const isTop = i < 3;

                        const gradeColor =
                            r.grade === 'S' ? '#ffd86b' :
                                r.grade === 'A' ? '#7cf3ff' :
                                    r.grade === 'B' ? '#9fa8ff' :
                                        '#aaa';

                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '36px 1.6fr 1.2fr .9fr .8fr 1fr',
                                    gap: '10px',
                                    padding: '8px 8px',
                                    fontSize: '12px',
                                    color: '#fff',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    background: isTop
                                        ? 'linear-gradient(90deg, rgba(255,200,80,0.25), rgba(255,80,80,0.12))'
                                        : 'transparent',
                                    fontWeight: isTop ? 600 : 400,
                                }}
                            >
                                {/* Profile */}
                                <div>
                                    {r.profileImg ? (
                                        <img
                                            src={r.profileImg}
                                            alt=""
                                            style={{ width: 28, height: 28, borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: 'radial-gradient(circle at 30% 30%, #666, #222)',
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Name */}
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {r.nickname}
                                </div>

                                {/* Score */}
                                <div style={{ textAlign: 'right' }}>{r.score}</div>

                                {/* Accuracy */}
                                <div style={{ textAlign: 'center' }}>{r.accuracy}%</div>

                                {/* Grade */}
                                <div style={{ textAlign: 'center', color: gradeColor, fontWeight: 700 }}>
                                    {r.grade}
                                </div>

                                {/* Combo */}
                                <div style={{ textAlign: 'right' }}>{r.maxCombo}</div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
