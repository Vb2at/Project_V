export async function reportActionApi(reportId, actionType, actionReason) {
    const res = await fetch(`/api/admin/report/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ actionType, actionReason }),
    });

    if(res.status === 401) throw new Error('관리자 권한이 필요합니다.');
    if(!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`신고 처리에 실패했습니다. (${res.status}) ${text}`);
    }
    return res.json().catch(() => ({}));
}