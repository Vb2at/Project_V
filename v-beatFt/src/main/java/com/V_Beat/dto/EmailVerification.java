package com.V_Beat.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class EmailVerification {
    private String email;
    private String code;
    private LocalDateTime expiryTime;
    private boolean verified;
}