package com.V_Beat.config;

import java.security.Principal;
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
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	// =========================
	// 접속자 / 관전자 / 플레이어 관리 서비스 (DI)
	// =========================
	private final OnlineUserService onlineUserService;
	private final BattleSessionService battleSessionService;

	public WebSocketConfig(OnlineUserService onlineUserService,
	                       BattleSessionService battleSessionService) {
		this.onlineUserService = onlineUserService;
		this.battleSessionService = battleSessionService;
	}

	// =========================
	// 메시지 브로커 설정
	// =========================
	@Override
	public void configureMessageBroker(MessageBrokerRegistry config) {

		// ✅ /queue 추가 (convertAndSendToUser 용)
		config.enableSimpleBroker("/topic", "/queue");

		// ✅ 클라 -> 서버 prefix
		config.setApplicationDestinationPrefixes("/app");

		// ✅ user destination prefix (명시)
		config.setUserDestinationPrefix("/user");
	}

	// =========================
	// WebSocket 엔드포인트 등록
	// =========================
	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {

		registry.addEndpoint("/ws")
				.addInterceptors(new HandshakeInterceptor() {

					@Override
					public boolean beforeHandshake(ServerHttpRequest request,
					                               ServerHttpResponse response,
					                               WebSocketHandler wsHandler,
					                               Map<String, Object> attributes) throws Exception {

						if (request instanceof ServletServerHttpRequest servletRequest) {
							// 세션 없으면 그대로 통과(= 이후 CONNECT에서 차단)
							HttpSession session = servletRequest.getServletRequest().getSession(false);
							if (session == null) return true;

							Object loginMember = session.getAttribute("loginMember");
							if (loginMember instanceof Member member) {
								// ✅ 세션에서 userId를 WS sessionAttributes로 넘김
								attributes.put("userId", member.getId());
							}
						}
						return true;
					}

					@Override
					public void afterHandshake(ServerHttpRequest request,
					                           ServerHttpResponse response,
					                           WebSocketHandler wsHandler,
					                           Exception exception) {
						// no-op
					}
				})

				// ✅ (선택) localhost만 허용: 지금 OK
				.setAllowedOriginPatterns(
						"http://localhost:*",
						"http://127.0.0.1:*"
				)
				.withSockJS();
	}

	// =========================
	// Inbound 인터셉터
	// =========================
	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {

		registration.interceptors(new ChannelInterceptor() {

			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {

				StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

				// 1️⃣ command null 방어 (heartbeat 등)
				StompCommand cmd = accessor.getCommand();
				if (cmd == null) return message;

				// 2️⃣ sessionAttributes에서 userId 안전 파싱
				Map<String, Object> attrs = accessor.getSessionAttributes();
				Integer userId = getUserIdSafe(attrs);

				// =========================
				// 🚫 CONNECT 차단 정책
				// =========================
				if (StompCommand.CONNECT.equals(cmd)) {

					// ❗ 로그인 안 된 WebSocket 연결 차단
					if (userId == null) {
						return null;
					}

					// ✅ Principal 세팅 (convertAndSendToUser 필수)
					if (accessor.getUser() == null) {
						accessor.setUser((Principal) () -> String.valueOf(userId));
					}

					// ✅ 동일 세션 CONNECT 중복 방지
					if (attrs != null && Boolean.TRUE.equals(attrs.get("onlineAdded"))) {
						return message;
					}
					if (attrs != null) attrs.put("onlineAdded", true);

					onlineUserService.addUser(userId);
					return message;
				}

				// =========================
				// 🚫 CONNECT 이후에도 userId 없으면 무시
				// =========================
				if (userId == null) {
					return null;
				}

				// =========================
				// DISCONNECT
				// =========================
				if (StompCommand.DISCONNECT.equals(cmd)) {

					// DISCONNECT 중복 방지
					if (attrs != null && Boolean.TRUE.equals(attrs.get("disconnected"))) {
						return message;
					}
					if (attrs != null) attrs.put("disconnected", true);

					onlineUserService.removeUser(userId);

					// 방 / 관전자 상태 정리
					battleSessionService.spectatorLeaveAll(userId);
					battleSessionService.playerLeaveAll(userId);
				}

				return message;
			}

			/**
			 * ✅ sessionAttributes에서 userId 안전 파싱
			 */
			private Integer getUserIdSafe(Map<String, Object> attrs) {
				if (attrs == null) return null;

				Object v = attrs.get("userId");
				if (v == null) return null;

				if (v instanceof Integer) return (Integer) v;
				if (v instanceof Number) return ((Number) v).intValue();

				if (v instanceof String s) {
					try {
						return Integer.parseInt(s);
					} catch (NumberFormatException e) {
						return null;
					}
				}
				return null;
			}
		});
	}
}
