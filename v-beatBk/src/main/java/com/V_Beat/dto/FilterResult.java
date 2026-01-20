package com.V_Beat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FilterResult {
    private String content;
    private boolean filtered;
    private String filterType;

    public static FilterResult pass(String original) {
        return new FilterResult(original, false, null);
    }
}
