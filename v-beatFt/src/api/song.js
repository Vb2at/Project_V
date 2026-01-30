//api/song.js
import { api } from './client';

//본인 업로드 곡 조회
export const getMysongs = (visibility) => {
    return api.get('/api/songs/my', {
        params:
            visibility && visibility !== 'ALL'
                ? { visibility }
                : {},
    });
};

//곡 삭제
export const deleteSong = (songId) => {
    return api.delete(`/api/songs/${songId}`);
}

//토큰으로 곡 정보 조회
export const getSongInfo = (songId, token) => {
    if (token) {
        return api.get('/api/songs/info', {params: { token }});
    }
    return api.get(`/api/songs/${songId}`);
}