// src/pages/multi/MultiRoomList.jsx (경로는 프로젝트에 맞춰 유지)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Common/Header";
import Background from "../../components/Common/Background";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs.min.js";

function formatTime(sec) {
  if (sec == null || isNaN(sec) || Number(sec) <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sanitizeTitle(t) {
  if (!t) return "";
  return String(t).replace(/\.mp3$/i, "");
}

export default function MultiRoomList() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/multi/rooms", { credentials: "include" });
      if (!res.ok) throw new Error("rooms fetch failed");
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.message || "rooms fetch failed");
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch (e) {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      onConnect: () => {
        client.subscribe("/topic/multi/rooms", (msg) => {
          const data = JSON.parse(msg.body);
          setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
        });
      },
    });

    client.activate();

    return () => client.deactivate();
  }, []);

  const goRoom = async (roomId) => {
    try {
      const joinRes = await fetch(`/api/multi/rooms/${roomId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!joinRes.ok) throw new Error("join failed");
      const joinData = await joinRes.json();
      if (!joinData?.ok) throw new Error(joinData?.message || "join failed");

      navigate(`/multi/room/${roomId}`);
    } catch (e) {
      alert("방 입장에 실패했습니다.");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Background />
      <Header />

      <main style={{ position: "absolute", top: 64, left: 0, right: 0, bottom: 0 }}>
        <div
          style={{
            position: "absolute",
            left: "10%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48%",
            height: "62%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* 🔵 멀티 컨트롤 바 */}
          <div
            style={{
              height: 42,
              border: "1px solid rgba(90,234,255,0.6)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
            }}
          >
            <button onClick={loadRooms} disabled={loading}>
              {loading ? "로딩..." : "새로고침"}
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/multi/rooms", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      roomName: "테스트 방",
                      songId: 1,
                      isPrivate: false,
                    }),
                  });

                  if (!res.ok) throw new Error("create failed");

                  await loadRooms(); // 🔴 중요
                } catch (e) {
                  alert("방 생성 실패");
                }
              }}
            >
              방 만들기
            </button>
            <button
              onClick={() => alert("초대 입장은 Invite 플로우에서 처리됩니다.")}
            >
              초대 입장
            </button>
          </div>

          {/* 🟡 방 리스트 영역 */}
          <div
            style={{
              flex: 1,
              border: "2px solid rgba(255,255,0,0.8)",
              borderRadius: 12,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {rooms.length === 0 ? (
              <div style={{ opacity: 0.8 }}>
                {loading ? "불러오는 중..." : "현재 공개 방이 없습니다."}
              </div>
            ) : (
              rooms.map((r) => {
                const title = sanitizeTitle(r.songTitle);
                return (
                  <div
                    key={r.roomId}
                    style={{
                      border: "1px solid rgba(90,234,255,0.45)",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "rgba(10,20,30,0.55)",
                    }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 10,
                        background: "#222",
                        overflow: "hidden",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.9,
                      }}
                    >
                      {r.coverPath ? (
                        <img
                          src={r.coverPath}
                          alt="cover"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        "COVER"
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {r.roomName}
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 2 }}>
                        {title} · {r.diff || "-"} · {formatTime(r.lengthSec)}
                      </div>
                      <div style={{ opacity: 0.75, marginTop: 2 }}>
                        {r.players?.length ?? 0} / {r.maxPlayers}
                        {r.isPrivate ? " · PRIVATE" : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => goRoom(r.roomId)}
                      disabled={r.players?.length >= r.maxPlayers}
                      style={{ padding: "8px 14px" }}
                    >
                      입장
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 🔴 오른쪽 패널 */}
        <div
          style={{
            position: "absolute",
            right: "10%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "22%",
            height: "70%",
            borderRadius: 14,
            background: "rgba(120,0,0,0.35)",
          }}
        />
      </main>
    </div>
  );
}
