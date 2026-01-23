package com.V_Beat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.V_Beat.interceptor.BlockUserInterceptor;
import com.V_Beat.interceptor.LoginCheckInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final LoginCheckInterceptor authInterceptor;
    private final BlockUserInterceptor blockUserInterceptor;

    public WebConfig(LoginCheckInterceptor authInterceptor,
    		BlockUserInterceptor blockUserInterceptor) {
        this.authInterceptor = authInterceptor;
        this.blockUserInterceptor = blockUserInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
    	//로그인 확인
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/auth/**",
                    "/oauth/**",
                    "/error"
                );
        
        //차단 여부 확인 (로그인 이후)
        registry.addInterceptor(blockUserInterceptor)
        		.addPathPatterns("/api/**")
        		.excludePathPatterns(
                    "/api/auth/**",
                    "/oauth/**",
                    "/error",
                    "/api/admin/**",          
                    "/api/songs/*/audio",     
                    "/api/songs/*/preview",
                    "/api/user/myInfo",
                    "/api/songs/*/audio",
                    "/api/songs/*/notes",
                    "/api/songs/*/cover",
                    "/api/songs",
                    "/api/ranking/*/*"
        		);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
    	registry.addResourceHandler("/upload/**")
        		.addResourceLocations("file:./upload/");

        registry.addResourceHandler("/profileImg/**")
                .addResourceLocations("file:./upload/profileImg/");
    }
}