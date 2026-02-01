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

    public WebSocketConfig(
        OnlineUserService onlineUserService,
        BattleSessionService battleSessionService
    ) {
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
                    public boolean beforeHandshake(
                        ServerHttpRequest request,
                        ServerHttpResponse response,
                        WebSocketHandler wsHandler,
                        Map<String, Object> attributes
                    ) {
                        if (request instanceof ServletServerHttpRequest servletRequest) {
                            HttpSession session =
                                servletRequest.getServletRequest().getSession(false);
                            if (session == null) return true;

                            Object loginMember = session.getAttribute("loginMember");
                            if (loginMember instanceof User user) {
                                attributes.put("userId", user.getId());
                                return true;
                            }

                            Object loginUserId = session.getAttribute("loginUserId");
                            Integer id = parseIntSafe(loginUserId);
                            if (id != null) {
                                attributes.put("userId", id);
                            }
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(
                        ServerHttpRequest request,
                        ServerHttpResponse response,
                        WebSocketHandler wsHandler,
                        Exception exception
                    ) {}

                    private Integer parseIntSafe(Object v) {
                        if (v == null) return null;
                        if (v instanceof Integer) return (Integer) v;
                        if (v instanceof Number) return ((Number) v).intValue();
                        if (v instanceof String s) {
                            try { return Integer.parseInt(s); }
                            catch (Exception e) { return null; }
                        }
                        return null;
                    }
                }
            )
            .setHandshakeHandler(new DefaultHandshakeHandler() {
                @Override
                protected Principal determineUser(
                    ServerHttpRequest request,
                    WebSocketHandler wsHandler,
                    Map<String, Object> attributes
                ) {
                    Object uid = attributes.get("userId");
                    if (uid == null) return null;
                    return () -> String.valueOf(uid);
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

                // CONNECT
                if (StompCommand.CONNECT.equals(cmd)) {

                    if (userId == null) return null;

                    if (accessor.getUser() == null) {
                        accessor.setUser((Principal) () -> String.valueOf(userId));
                    }

                    if (attrs != null && Boolean.TRUE.equals(attrs.get("onlineAdded"))) {
                        return message;
                    }
                    if (attrs != null) attrs.put("onlineAdded", true);

                    onlineUserService.addUser(userId);
                    return message;
                }

                // userId 없는 메시지는 차단
                if (userId == null) return null;

                // DISCONNECT (여기서는 전역 상태만 정리)
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
                    try { return Integer.parseInt(s); }
                    catch (NumberFormatException e) { return null; }
                }
                return null;
            }
        });
    }

    @Override
    public void configureWebSocketTransport(
        org.springframework.web.socket.config.annotation.WebSocketTransportRegistration registry
    ) {
        registry
            .setMessageSizeLimit(2 * 1024 * 1024)
            .setSendBufferSizeLimit(2 * 1024 * 1024)
            .setSendTimeLimit(20_000);
    }
}
