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
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

import com.V_Beat.dto.User;
import com.V_Beat.service.BattleSessionService;
import com.V_Beat.service.OnlineUserService;

import jakarta.servlet.http.HttpSession;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final OnlineUserService onlineUserService;
	private final BattleSessionService battleSessionService;

	public WebSocketConfig(OnlineUserService onlineUserService,
	                       BattleSessionService battleSessionService) {
		this.onlineUserService = onlineUserService;
		this.battleSessionService = battleSessionService;
	}

	@Override
	public void configureMessageBroker(MessageBrokerRegistry config) {
		config.enableSimpleBroker("/topic", "/queue");
		config.setApplicationDestinationPrefixes("/app");
		config.setUserDestinationPrefix("/user");
	}

	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {

		registry.addEndpoint("/ws")
				.addInterceptors(
						new HttpSessionHandshakeInterceptor(),
						new HandshakeInterceptor() {
							@Override
							public boolean beforeHandshake(ServerHttpRequest request,
							                               ServerHttpResponse response,
							                               WebSocketHandler wsHandler,
							                               Map<String, Object> attributes) throws Exception {

								if (request instanceof ServletServerHttpRequest servletRequest) {
									HttpSession session = servletRequest.getServletRequest().getSession(false);
									if (session == null) return true;

									// ✅ 1) loginMember(User) 우선
									Object loginMember = session.getAttribute("loginMember");
									if (loginMember instanceof User user) {
										attributes.put("userId", user.getId());
										return true;
									}

									// ✅ 2) loginUserId도 지원(프로젝트에서 흔히 같이 씀)
									Object loginUserId = session.getAttribute("loginUserId");
									Integer id = parseIntSafe(loginUserId);
									if (id != null) {
										attributes.put("userId", id);
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

							private Integer parseIntSafe(Object v) {
								if (v == null) return null;
								if (v instanceof Integer) return (Integer) v;
								if (v instanceof Number) return ((Number) v).intValue();
								if (v instanceof String s) {
									try { return Integer.parseInt(s); } catch (Exception e) { return null; }
								}
								return null;
							}
						}
				)

				// ✅ handshake 단계에서 Principal 확정
				.setHandshakeHandler(new DefaultHandshakeHandler() {
					@Override
					protected Principal determineUser(ServerHttpRequest request,
					                                  WebSocketHandler wsHandler,
					                                  Map<String, Object> attributes) {
						Object uid = attributes.get("userId");
						if (uid == null) return null;
						String name = String.valueOf(uid);
						return () -> name; // Principal.name = userId
					}
				})

				.setAllowedOriginPatterns(
						"http://localhost:*",
						"http://127.0.0.1:*"
				)
				.withSockJS();
	}

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {

		registration.interceptors(new ChannelInterceptor() {
			@Override
			public Message<?> preSend(Message<?> message, MessageChannel channel) {

				StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

				StompCommand cmd = accessor.getCommand();
				if (cmd == null) return message;

				Map<String, Object> attrs = accessor.getSessionAttributes();
				Integer userId = getUserIdSafe(attrs);

				// ✅ CONNECT: userId 없으면 차단(정상 정책)
				if (StompCommand.CONNECT.equals(cmd)) {

					System.out.println("[WS CONNECT] userId=" + userId + ", attrs=" + attrs
							+ ", principal=" + (accessor.getUser() != null ? accessor.getUser().getName() : null));

					if (userId == null) {
						return null;
					}

					// 보험: Principal 비어있으면 세팅
					if (accessor.getUser() == null) {
						accessor.setUser((Principal) () -> String.valueOf(userId));
					}

					// 중복 CONNECT 방지
					if (attrs != null && Boolean.TRUE.equals(attrs.get("onlineAdded"))) {
						return message;
					}
					if (attrs != null) attrs.put("onlineAdded", true);

					onlineUserService.addUser(userId);
					return message;
				}

				// CONNECT 이후에도 userId 없으면 무시
				if (userId == null) return null;

				// DISCONNECT 처리
				if (StompCommand.DISCONNECT.equals(cmd)) {

					if (attrs != null && Boolean.TRUE.equals(attrs.get("disconnected"))) {
						return message;
					}
					if (attrs != null) attrs.put("disconnected", true);

					onlineUserService.removeUser(userId);

					battleSessionService.spectatorLeaveAll(userId);
					battleSessionService.playerLeaveAll(userId);
				}

				return message;
			}

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
