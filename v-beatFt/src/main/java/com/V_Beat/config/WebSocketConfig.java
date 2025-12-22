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
@EnableWebSocketMessageBroker // STOMP 프로토콜을 사용한 WebSocket 메시지 브로커 활성화
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	// 접속자 관리 서비스 (DI)
	private final OnlineUserService onlineUserService;

	public WebSocketConfig(OnlineUserService onlineUserService) {
		this.onlineUserService = onlineUserService;
	}

	// 메시지 브로커 설정
	// 클라이언트가 구독할 경로와 메시지를 보낼 경로 정의
	@Override
	public void configureMessageBroker(MessageBrokerRegistry config) {
		// 클라이언트가 구독하는 경로 접두사 (예: /topic/chat, /topic/online-users)
		config.enableSimpleBroker("/topic");

		// 클라이언트가 메시지를 보낼 경로 접두사 (예: /app/chat)
		config.setApplicationDestinationPrefixes("/app");
	}

	// WebSocket 엔드포인트 등록
	// 클라이언트가 연결할 경로와 HTTP 세션 → WebSocket 세션 데이터 전달 설정
	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws") // WebSocket 연결 경로: ws://localhost:8080/ws
				.addInterceptors(new HandshakeInterceptor() {

					// WebSocket 핸드셰이크 직전 실행
					// HTTP 세션에서 로그인 정보(loginMember)를 가져와 WebSocket 세션에 저장
					@Override
					public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
							WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {

						// ServerHttpRequest를 ServletServerHttpRequest로 캐스팅하여 HttpSession 접근
						if (request instanceof ServletServerHttpRequest) {
							ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
							HttpSession session = servletRequest.getServletRequest().getSession();

							// HTTP 세션에서 loginMember 추출
							Object loginMember = session.getAttribute("loginMember");
							if (loginMember != null && loginMember instanceof Member) {
								Member member = (Member) loginMember;
								// WebSocket 세션 속성에 userId 저장 (CONNECT/DISCONNECT에서 사용)
								attributes.put("userId", member.getId());
							}
						}
						return true; // 핸드셰이크 계속 진행
					}

					// 핸드셰이크 완료 후 실행 (현재는 미사용)
					@Override
					public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
							WebSocketHandler wsHandler, Exception exception) {
						// 추가 처리 없음
					}
				}).setAllowedOriginPatterns("localhost:*") // 모든 Origin 허용 (프로덕션에서는 특정 도메인만 허용 권장)
				.withSockJS(); // SockJS 폴백 옵션 활성화 (WebSocket 미지원 브라우저 대응)
	}

	// 클라이언트 → 서버로 들어오는 메시지 채널 인터셉터 등록
	// CONNECT: 접속자 추가
	// DISCONNECT: 접속자 제거
	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(new ChannelInterceptor() {

			// 메시지 전송 직전 실행
			// STOMP 커맨드(CONNECT/DISCONNECT)를 감지하여 접속자 관리
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {
				// STOMP 헤더 접근자로 메시지 래핑
				StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
				// CONNECT 커맨드: 사용자 접속 시
				if (StompCommand.CONNECT.equals(accessor.getCommand())) {
					// WebSocket 세션 속성에서 userId 추출 (HandshakeInterceptor에서 저장한 값)
					Integer userId = (Integer) accessor.getSessionAttributes().get("userId");
					if (userId != null) {
						// 접속자 목록에 추가 → 이벤트 발행 → 모든 클라이언트에게 브로드캐스트
						onlineUserService.addUser(userId);
					}
				}
				// DISCONNECT 커맨드: 사용자 접속 종료 시
				if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
					Integer userId = (Integer) accessor.getSessionAttributes().get("userId");
					if (userId != null) {
						// 접속자 목록에서 제거 → 이벤트 발행 → 모든 클라이언트에게 브로드캐스트
						onlineUserService.removeUser(userId);
					}
				}
				return message; // 메시지 계속 전달
			}
		});
	}
}