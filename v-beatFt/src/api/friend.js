const BASE = "/api/friend";

async function req(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include", // ✅ 세션쿠키(JSESSIONID) 필수
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  // FriendController는 어떤 건 string, 어떤 건 json이라 혼합 처리
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    // 에러가 text로 오는 경우 대비
    throw new Error(text || `HTTP ${res.status}`);
  }

  // JSON이면 JSON으로
  if (ct.includes("application/json")) {
    return text ? JSON.parse(text) : null;
  }

  // 아니면 문자열 그대로
  return text;
}

/** 친구 목록 */
export const fetchFriendList = async () => {
  const res = await fetch(`${BASE}/list`, {
    method: 'GET',
    credentials: 'include', // ✅ 세션 쿠키 포함
  });

  if (!res.ok) throw new Error('Failed to fetch friend list');

  return res.json();
};

/** 받은 친구 요청 목록 */
export const fetchFriendRequests = () => req(`${BASE}/requests`);

/** 보낸 요청 목록(필요하면) */
export const fetchSentRequests = () => req(`${BASE}/sent`);

/** 친구 요청 보내기 (keyword=email or nickName) */
export const sendFriendRequest = (keyword) =>
  req(`${BASE}/request?keyword=${encodeURIComponent(keyword)}`, {
    method: "POST",
  });

/** 요청 수락 (id=FriendRequest.id) */
export const acceptFriendRequest = (id) =>
  req(`${BASE}/accept?id=${encodeURIComponent(id)}`, { method: "POST" });

/** 요청 거절 */
export const rejectFriendRequest = (id) =>
  req(`${BASE}/reject?id=${encodeURIComponent(id)}`, { method: "POST" });

/** 요청 취소(보낸 요청에서 쓰는 기능) */
export const cancelFriendRequest = (id) =>
  req(`${BASE}/cancel?id=${encodeURIComponent(id)}`, { method: "POST" });

/** 친구 삭제 (targetId=상대 memberId) */
export const deleteFriend = (targetId) =>
  req(`${BASE}/delete?targetId=${encodeURIComponent(targetId)}`, {
    method: "POST",
  });
