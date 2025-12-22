package com.V_Beat.service;

import org.springframework.stereotype.Service;

import com.V_Beat.dto.EmailVerification;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


// 이메일 인증 코드 서비스
// 메모리 기반,서버 재시작 시 초기화됨
@Service
public class VerificationService {
    
    // 이메일별 인증 정보 저장
    private Map<String, EmailVerification> verificationMap = new ConcurrentHashMap<>();
    
    // 인증 코드 저장 (5분 유효)
    // 회원가입 시 이메일 인증 코드 발송 후 호출
    public void saveVerification(String email, String code) {
        EmailVerification verification = new EmailVerification();
        verification.setEmail(email);
        verification.setCode(code);
        verification.setExpiryTime(LocalDateTime.now().plusMinutes(5));  // 5분 후 만료
        verification.setVerified(false);  // 아직 미인증
        
        verificationMap.put(email, verification);
    }
    
    // 인증 코드 검증
    // 사용자가 입력한 코드와 비교
    public boolean verifyCode(String email, String code) {
        EmailVerification verification = verificationMap.get(email);
        
        if (verification == null) return false;  // 인증 정보 없음
        if (verification.getExpiryTime().isBefore(LocalDateTime.now())) return false;  // 만료됨
        if (!verification.getCode().equals(code)) return false;  // 코드 불일치
        
        verification.setVerified(true);  // 인증 완료 표시
        return true;
    }
    
    // 인증 완료 여부 확인
    // 회원가입 제출 시 인증 완료 여부 확인용
    public boolean isVerified(String email) {
        EmailVerification verification = verificationMap.get(email);
        return verification != null && verification.isVerified();
    }
    
    // 인증 정보 삭제
    // 회원가입 완료 후 인증 정보 제거
    public void removeVerification(String email) {
        verificationMap.remove(email);
    }
}