import { api } from "./client";

//로그아웃 API
export async function logoutApi() {
    return api.post("/api/auth/logout"); 
}

//로그인 상태 확인 API
export async function statusApi() {
    return api.get("/api/auth/login/status");
}