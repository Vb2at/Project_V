import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080", // 스프링 포트
  withCredentials: true,            // 세션 쓰면 켜두는게 좋음
});