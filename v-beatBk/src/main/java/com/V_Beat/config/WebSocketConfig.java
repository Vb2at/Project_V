package com.V_Beat.config;

import java.util.Map;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.V_Beat.dto.Member;
import com.V_Beat.service.OnlineUserService;

import jakarta.servlet.http.HttpSession;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final OnlineUserService onlineUserService;

    public WebSocketConfig(OnlineUserService onlineUserService) {
        this.onlineUserService = onlineUserService;
    }

    /**
     * 메시지 브로커 설정
     * - /topic : 클라이언트 구독용 (브로드캐스트)
     * - /app   : 클라이언트 -> 서버 전송용 (@MessageMapping)
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    /**
     * STOMP 엔드포인트 등록
     * - /ws 로 WebSocket 연결
     * - HandshakeInterceptor에서 HTTP 세션(loginMember) -> WS session attributes로 userId 전달
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .addInterceptors(new HandshakeInterceptor() {

                @Override
                public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                        WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

                    // Servlet 기반 요청에서만 HttpSession 접근 가능
                    if (!(request instanceof ServletServerHttpRequest servletRequest)) {
                        // (선택) ServletRequest가 아니면 인증정보를 꺼낼 수 없으니 차단할지 결정
                        return false;
                    }

                    // ✅ 수정 1) getSession(false) 사용
                    // - getSession()은 세션이 없으면 새로 생성해 "가짜 세션"이 생길 수 있음
                    HttpSession session = servletRequest.getServletRequest().getSession(false);
                    if (session == null) {
                        // ✅ 로그인 세션이 없으면 WS 연결 거절(권장)
                        return false;
                    }

                    // HTTP 세션에서 loginMember 추출
                    Object loginMember = session.getAttribute("loginMember");
                    if (!(loginMember instanceof Member member)) {
                        // ✅ 로그인 정보 없으면 WS 연결 거절(권장)
                        return false;
                    }

                    // WS 세션 attributes에 userId 저장 (CONNECT/DISCONNECT에서 사용)
                    attributes.put("userId", member.getId());

                    return true;
                }

                @Override
                public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                        WebSocketHandler wsHandler, Exception exception) {
                    // 필요 시 로깅/추적
                }
            })

            // ✅ 수정 2) Origin 패턴 수정
            // 브라우저 Origin은 보통 "http://localhost:8080" 처럼 scheme 포함
            // 기존 "localhost:*"는 매칭 실패 가능
            .setAllowedOriginPatterns(
                "http://localhost:*",
                "http://127.0.0.1:*"
                // 운영 환경에서는 실제 도메인만 허용하도록 변경 권장
            )

            .withSockJS();
    }

    /**
     * 클라이언트 -> 서버 inbound 채널 인터셉터
     * - CONNECT / DISCONNECT를 감지하여 온라인 상태를 관리
     *
     * ✅ 수정 3) 멀티탭/멀티디바이스 대응
     * - userId만 Set으로 관리하면, 탭 2개 열고 1개 닫을 때 오프라인으로 오판 가능
     * - sessionId까지 함께 전달해서 "세션 단위"로 관리하는 것이 안전
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {

            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

                // ✅ 수정 4) DISCONNECT 시점에 sessionAttributes가 null일 수 있어 방어
                Map<String, Object> attrs = accessor.getSessionAttributes();
                if (attrs == null) {
                    return message;
                }

                Integer userId = (Integer) attrs.get("userId");
                if (userId == null) {
                    return message;
                }

                // 같은 userId라도 탭/디바이스마다 sessionId가 다름
                String sessionId = accessor.getSessionId();

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // ✅ 권장: 세션 단위 등록
                    // OnlineUserService에 addSession/removeSession 구현 필요
                    onlineUserService.addSession(userId, sessionId);
                }

                if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                    onlineUserService.removeSession(userId, sessionId);
                }

                return message;
            }
        });
    }
}
