import { api } from "./client";

//로그아웃 API
export async function logoutApi() {
    return api.post("/api/auth/logout"); 
}

//로그인 상태 확인 API
export async function statusApi() {
    return api.get("/api/auth/login/status");
}

//회원탈퇴 API
export async function deleteAccountApi() {
    return api.post("/api/user/deleteAccount");
}

//비밀번호 변경 API
export async function changePasswordApi(currentPw, newPw) {
    return api.post("/api/user/change-pw", {
        currentPw,
        loginPw: newPw,
        loginType: 0,  //일반 로그인
    });
}