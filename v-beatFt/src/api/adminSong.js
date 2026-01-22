const BASE = '/api/admin/songs';

//심사 대기 곡 목록
export async function fetchReviewSongs({ visibility = 'PENDING', page = 1, size = 10, keyword = '' } = {}) {
    const qs = new URLSearchParams();
    qs.set('visibility', visibility);
    qs.set('page', String(page));
    qs.set('size', String(size));
    if (keyword?.trim()) {
        qs.set('keyword', keyword.trim());
    }

    const res = await fetch(`${BASE}?${qs.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });

    if (res.status === 401) {
        throw new Error('관리자 권한이 필요합니다.');
    }

    if (!res.ok) {
        throw new Error(`곡 심사 목록 조회 실패 (${res.status})`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
        return { list: data, total: data.length, page, size };
    }
    return {
        list: data?.list ?? [],
        total: data?.total ?? data?.count ?? 0,
        page: data?.page ?? page,
        size: data?.size ?? size,
    };
}

//곡 상세 조회 
export async function fetchReviewSongDetail(songId) {
    const res = await fetch(`${BASE}/${songId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });

    if (res.status === 401) {
        throw new Error('관리자 권한이 필요합니다.');
    }

    if (!res.ok) {
        throw new Error(`곡 상세 조회 실패 (${res.status})`)
    }
    return res.json();
}

//곡 심사 처리
export async function reviewSong(songId, action, reason) {
    const res = await fetch(`/api/admin/songs/${songId}/review`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
            action,
            reason,
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || '심사 처리 실패');
    }
    return data;
}