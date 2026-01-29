import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InviteModal from "./InviteModal";
import { useWebSocket } from "@/contexts/WebSocketProvider";

export default function InviteListener() {
  const { stompClient } = useWebSocket();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (!stompClient) return;

    const sub = stompClient.subscribe("/user/queue/invite", (msg) => {
      const data = JSON.parse(msg.body);
      setInvite(data);
      setOpen(true);
    });

    return () => sub.unsubscribe();
  }, [stompClient]);

  if (!open || !invite) return null;

  return (
    <InviteModal
      from={invite.from}
      onAccept={() => {
        setOpen(false);
        navigate(`/game/play?mode=multi&roomId=${invite.roomId}`);
      }}
      onReject={() => {
        setOpen(false);
      }}
    />
  );
}
