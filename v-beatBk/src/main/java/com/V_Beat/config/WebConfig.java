package com.V_Beat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
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
    public void addCorsMappings(CorsRegistry registry) {
    	registry.addMapping("/api/**").allowedOrigins("http://localhost:5173")
    	.allowedMethods("*").allowedHeaders("*");
    }
}