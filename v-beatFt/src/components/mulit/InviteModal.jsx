export default function InviteModal({ from, onAccept, onReject }) {
    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
        }}>
            <div style={{
                width: 320,
                padding: 20,
                background: "#111",
                borderRadius: 12,
                border: "1px solid #5aeaff",
                color: "#fff",
            }}>
                <div style={{ marginBottom: 12 }}>
                    {from} 님이 대결을 신청했습니다.
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 12,
                        marginTop: 50,
                    }}
                >
                    {/* 수락 */}
                    <button
                        onClick={onAccept}
                        style={{
                            padding: "6px 18px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "1px solid #5aeaff",
                            color: "#5aeaff",
                            cursor: "pointer",
                        }}
                    >
                        수락
                    </button>

                    {/* 거절 */}
                    <button
                        onClick={onReject}
                        style={{
                            padding: "6px 18px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "1px solid rgba(255,80,80,0.9)",
                            color: "rgba(255,80,80,0.9)",
                            cursor: "pointer",
                        }}
                    >
                        거절
                    </button>
                </div>

            </div>
        </div>
    );
}
