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
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.OnlineUserService;

import jakarta.servlet.http.HttpSession;

@Configuration
@EnableWebSocketMessageBroker // STOMP 프로토콜을 사용한 WebSocket 메시지 브로커 활성화
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	// =========================
	// 접속자 / 관전자 / 플레이어 관리 서비스 (DI)
	// =========================
	private final OnlineUserService onlineUserService;
	private final BattleSessionService battleSessionService;

<<<<<<< HEAD
	public WebSocketConfig(OnlineUserService onlineUserService, BattleSessionService battleSessionService) {
=======
	public WebSocketConfig(
	        OnlineUserService onlineUserService,
	        BattleSessionService battleSessionService) {
>>>>>>> 5d4baf5 (init)
		this.onlineUserService = onlineUserService;
		this.battleSessionService = battleSessionService;
	}

	// =========================
	// 메시지 브로커 설정
	// =========================
	@Override
	public void configureMessageBroker(MessageBrokerRegistry config) {

		// 클라이언트 구독 prefix
		// 예: /topic/channel/{id}, /topic/user.{id}
		config.enableSimpleBroker("/topic");

		// 클라이언트 → 서버 전송 prefix
		// 예: /app/chat, /app/channel/join
		config.setApplicationDestinationPrefixes("/app");
	}

	// =========================
	// WebSocket 엔드포인트 등록
	// =========================
	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {

		registry.addEndpoint("/ws") // ws://localhost:8080/ws
				.addInterceptors(new HandshakeInterceptor() {

					/**
					 * WebSocket 핸드셰이크 직전 실행
					 * - HTTP Session → WebSocket Session으로 로그인 정보 전달
					 */
					@Override
					public boolean beforeHandshake(
					        ServerHttpRequest request,
					        ServerHttpResponse response,
					        WebSocketHandler wsHandler,
					        Map<String, Object> attributes) throws Exception {

						// Servlet 환경에서만 HttpSession 접근 가능
						if (request instanceof ServletServerHttpRequest servletRequest) {

							// 세션이 없으면 새로 만들지 않음
							HttpSession session =
							        servletRequest.getServletRequest().getSession(false);

							if (session == null) return true;

							// HTTP 세션에서 로그인 유저 꺼내기
							Object loginMember = session.getAttribute("loginMember");
<<<<<<< HEAD
							if (loginMember instanceof Member) {
								Member member = (Member) loginMember;
								// WebSocket 세션 속성에 userId 저장 (CONNECT/DISCONNECT에서 사용)
=======
							if (loginMember instanceof Member member) {
								// WebSocket 세션 속성에 userId 저장
>>>>>>> 5d4baf5 (init)
								attributes.put("userId", member.getId());
							}
						}
						return true;
					}

					@Override
					public void afterHandshake(
					        ServerHttpRequest request,
					        ServerHttpResponse response,
					        WebSocketHandler wsHandler,
					        Exception exception) {
					}
				})
				// =========================
				// CORS / Origin 허용 (개발환경)
				// =========================
				.setAllowedOriginPatterns(
						"http://localhost:*",
						"http://127.0.0.1:*"
				)
				.withSockJS();
	}

	// =========================
	// 클라이언트 → 서버 Inbound 인터셉터
	// =========================
	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {

		registration.interceptors(new ChannelInterceptor() {

			/**
			 * STOMP 메시지 수신 직전 실행
			 * - CONNECT: 접속자 추가
			 * - DISCONNECT: 접속자 제거 + 관전자/플레이어 상태 정리
			 */
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {

				StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

<<<<<<< HEAD
				// CONNECT 커맨드: 사용자 접속 시
=======
				// 세션 속성 null 방어
				Map<String, Object> attrs = accessor.getSessionAttributes();
				Integer userId = (attrs != null) ? (Integer) attrs.get("userId") : null;

				// 로그인 유저가 아니면 할 일 없음
				if (userId == null) return message;

				// CONNECT
>>>>>>> 5d4baf5 (init)
				if (StompCommand.CONNECT.equals(accessor.getCommand())) {
					onlineUserService.addUser(userId);
				}
<<<<<<< HEAD

				// DISCONNECT 커맨드: 사용자 접속 종료 시
				if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
					Integer userId = (Integer) accessor.getSessionAttributes().get("userId");
					if (userId != null) {
						// 접속자 목록에서 제거 → 이벤트 발행 → 모든 클라이언트에게 브로드캐스트
						onlineUserService.removeUser(userId);

						// 추가: 비정상 종료(탭 종료/네트워크 끊김) 때도 관전자 상태 정리
						battleSessionService.spectatorLeaveAll(userId);
					}
				}

				return message; // 메시지 계속 전달
=======
				// DISCONNECT
				else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {

					onlineUserService.removeUser(userId);

					// 탭 종료/네트워크 끊김 대비 정리
					// 1) 관전자 전부 제거
					battleSessionService.spectatorLeaveAll(userId);

					// 2) 플레이어도 전부 제거 (대결방 자동 퇴장)
					battleSessionService.playerLeaveAll(userId);
				}

				return message;
>>>>>>> 5d4baf5 (init)
			}
		});
	}
}
