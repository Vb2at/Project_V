import axios from 'axios';

export async function fetchAdminUsers({ page, size, keyword }) {
    const res = await axios.get('/api/admin/users', {
        params: { page, size, keyword }
    });
    return res.data; // { list: [...], total: number }
}