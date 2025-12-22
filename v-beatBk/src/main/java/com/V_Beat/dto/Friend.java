package com.V_Beat.dto;

import lombok.Data;

@Data
public class Friend {
    private int id;
    private int teamId;
    private int userId;
    private String regDate;
    private String teamName;      
    private String teamDesc;      
    private String inviterName;  
}