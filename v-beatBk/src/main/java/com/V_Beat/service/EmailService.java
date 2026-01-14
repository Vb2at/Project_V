package com.V_Beat.service;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import java.util.Random;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // 6자리 랜덤 인증 코드 생성
    public String generateCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);  // 100000 ~ 999999
        return String.valueOf(code);
    }

    //회원가입 이메일 인증 코드 발송 
    public void sendVerificationCode(String email, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(email);  // 수신자
            helper.setSubject("[V-BEAT] 이메일 인증 코드");  // 제목
            
            // HTML 형식 본문
            String htmlContent = "<h2>이메일 인증 코드</h2>" +
                    "<p>아래 인증 코드를 입력해주세요.</p>" +
                    "<h1 style='color: #0066cc;'>" + code + "</h1>" 
                    ;
            
            helper.setText(htmlContent, true);  // true: HTML 형식
            
            mailSender.send(message);  // 발송
        } catch (Exception e) {
            throw new RuntimeException("이메일 발송 실패", e);
        }
    }

    // 비밀번호 찾기 임시 비밀번호 발송
    public void sendTempPw(String email, String tempPw) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(email);
            helper.setSubject("[V-BEAT] 임시 비밀번호 발급");
            
            String htmlContent = "<h2>임시 비밀번호가 발급되었습니다</h2>" +
                    "<p>아래 임시 비밀번호로 로그인 후 마이페이지에서 변경해주세요.</p>" +
                    "<h1 style='color: #0066cc;'>" + tempPw + "</h1>" +
                    "<p>로그인 후 반드시 비밀번호를 변경해주세요.</p>";
            
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("이메일 발송 실패", e);
        }
    }

}