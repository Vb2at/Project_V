import axios from 'axios';

//유저 리스트 조회
export async function fetchAdminUsers({ page, size, keyword }) {
    const res = await axios.get('/api/admin/users', {
        params: { page, size, keyword }
    });
    return res.data; // { list: [...], total: number }
}

//유저 차단
export const blockUser = (userId, reason) => {
    return axios.post(`/api/admin/users/${userId}/block`, {
        reason,
    });
};

//유저 차단 해제
export function unblockUser(userId) {
    return axios.post(`/api/admin/users/${userId}/unblock`);
}