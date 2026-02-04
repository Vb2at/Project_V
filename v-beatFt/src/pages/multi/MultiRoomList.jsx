// src/pages/multi/MultiRoomList.jsx
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
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch {
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
    const room = rooms.find(r => r.roomId === roomId);
    if (!room || room.players?.length >= room.maxPlayers) {
      alert("정원이 모두 찼습니다.");
      await loadRooms();
      return;
    }

    setLoading(true);

    try {
      const joinRes = await fetch(`/api/multi/rooms/${roomId}/join`, {
        method: "POST",
        credentials: "include",
      });

      const data = await joinRes.json();

      if (!data?.ok) {
        if (data?.reason === "ROOM_FULL") {
          alert("정원이 모두 찼습니다.");
          await loadRooms();
          return;
        }
        throw new Error("join failed");
      }

      navigate(`/multi/room/${roomId}`);
    } catch {
      alert("방 입장에 실패했습니다.");
    } finally {
      setLoading(false);
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
          </div>

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
                const isFull = (r.players?.length ?? 0) >= r.maxPlayers;
                const title = sanitizeTitle(r.songTitle);

                return (
                  <div
                    key={r.roomId}
                    onClick={() => {
                      if (isFull) {
                        alert("정원이 모두 찼습니다.");
                        return;
                      }
                      goRoom(r.roomId);
                    }}
                    style={{
                      border: "1px solid rgba(90,234,255,0.45)",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,

                      /* ==== 핵심 시각 처리 ==== */
                      background: isFull
                        ? "rgba(60,60,60,0.7)"
                        : "rgba(10,20,30,0.55)",
                      opacity: isFull ? 0.55 : 1,
                      filter: isFull ? "grayscale(100%)" : "none",

                      /* ==== 핵심 클릭/커서 처리 ==== */
                      cursor: isFull ? "not-allowed" : "pointer",
                      pointerEvents: "auto",
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
                        {isFull && " · FULL"}
                        {r.isPrivate ? " · PRIVATE" : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
