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