package com.V_Beat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.V_Beat.interceptor.Interceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    private final Interceptor Interceptor;
    
    public WebConfig(Interceptor reqInterceptor) {
        this.Interceptor = reqInterceptor;
    }
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(Interceptor)
                .addPathPatterns("/**") 
                .excludePathPatterns(
                    "/resource/**",
                    "/error" 
                );
    }
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 업로드된 파일 경로 매핑
        registry.addResourceHandler("/upload/**")
                .addResourceLocations("file:///C:/DiscoDing/upload/");
    }
}
    