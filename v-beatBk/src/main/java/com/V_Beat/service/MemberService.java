package com.V_Beat.service;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dao.MemberDao;
import com.V_Beat.dto.Member;

@Service
public class MemberService {

    // =========================
    // DI
    // =========================
    private final MemberDao memberDao;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;
    private final OnlineUserService onlineUserService;

    // 대결 방(채널) 접속자 상태를 메모리로 관리
    private final BattleSessionService battleSessionService;

    public MemberService(MemberDao memberDao,
                         BCryptPasswordEncoder passwordEncoder,
                         EmailService emailService,
                         SimpMessagingTemplate messagingTemplate,
                         OnlineUserService onlineUserService,
                         BattleSessionService battleSessionService) {

        this.memberDao = memberDao;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.messagingTemplate = messagingTemplate;
        this.onlineUserService = onlineUserService;
        this.battleSessionService = battleSessionService;
    }

    // =========================
    // 공통 유틸
    // =========================

    /**
     * ✅ 개인 알림(보안 강화) 전송 헬퍼
     *
     * ✅ 클라이언트 구독 주소:
     * - /user/queue/notify
     *
     * ✅ 서버 전송 방식:
     * - convertAndSendToUser("123", "/queue/notify", payload)
     *
     * ⚠️ 전제:
     * - WebSocketConfig에서 CONNECT 시 Principal을 userId로 세팅해야 함
     *   (accessor.setUser(() -> String.valueOf(userId)))
     *
     * 이렇게 하면 "남의 채널 구독" 같은 취약점(/topic/user.{id})이 사라진다.
     */
    private void sendToUser(int toUserId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(toUserId),
                "/queue/notify",
                payload
        );
    }

    // =========================
    // 회원 기본 기능
    // =========================

    // socialId로 회원 조회
    public Member findBySocialId(String socialId, int loginType) {
        return this.memberDao.findBySocialId(socialId, loginType);
    }

    // 소셜 로그인 회원가입 (비밀번호 암호화 생략)
    public void joinSocial(Member member) {
        this.memberDao.join(member);
    }

    // 회원가입
    public void join(Member member) {
        String encodePW = passwordEncoder.encode(member.getLoginPw());
        member.setLoginPw(encodePW);
        this.memberDao.join(member);
    }

    // 닉네임으로 회원 조회
    public Member findByNickName(String nickName) {
        return this.memberDao.findByNickName(nickName);
    }

    // 로그인 처리 (일반 로그인만)
    public Member login(String email, String loginPw) {
        Member member = this.memberDao.findByEmail(email);
        if (member == null) return null;

        // 소셜 로그인 계정은 일반 로그인 불가
        if (member.getLoginType() != 0) return null;

        if (passwordEncoder.matches(loginPw, member.getLoginPw())) {
            return member;
        }
        return null;
    }

    // 이메일로 회원 조회
    public Member findByEmail(String email) {
        return this.memberDao.findByEmail(email);
    }

    // 임시 비밀번호 생성 (8자리 영문+숫자)
    public String generateTempPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder tempPw = new StringBuilder();
        Random random = new Random();

        for (int i = 0; i < 8; i++) {
            tempPw.append(chars.charAt(random.nextInt(chars.length())));
        }
        return tempPw.toString();
    }

    // 비밀번호 찾기 (임시 비밀번호 발급)
    public void resetPw(String email) {
        String tempPw = generateTempPassword();
        String encodedPw = passwordEncoder.encode(tempPw);

        Member member = this.memberDao.findByEmail(email);

        // ⚠️ member null 방어를 더 하고 싶으면 여기서 체크 가능
        this.memberDao.updatePw(member.getId(), encodedPw);

        emailService.sendTempPw(email, tempPw);
    }

    // 닉네임 변경
    public String changeNickName(int id, String newNickName) {
        if (newNickName == null || newNickName.trim().isEmpty()) return "emp";

        Member dupNickname = memberDao.findByNickName(newNickName);
        if (dupNickname != null) return "dup";

        memberDao.updateNickName(id, newNickName.trim());
        return "success";
    }

    // 비밀번호 변경
    public String changePassword(int id, String loginPw, String newPw) {
        if (loginPw == null || newPw == null || loginPw.trim().isEmpty() || newPw.trim().isEmpty()) {
            return "emp";
        }

        Member member = memberDao.findById(id);
        if (member == null) return "fail";

        if (!passwordEncoder.matches(loginPw, member.getLoginPw())) {
            return "diff";
        }

        String encodedNewPw = passwordEncoder.encode(newPw);
        memberDao.updatePassword(id, encodedNewPw);
        return "success";
    }

    // 프로필 이미지 업로드
    public String updateProfileImg(int id, MultipartFile file) {
        if (file == null || file.isEmpty()) return "emp";

        String originName = file.getOriginalFilename();
        if (originName == null || !originName.contains(".")) return "noneType";

        String ext = originName.substring(originName.lastIndexOf("."));
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)$")) return "noneType";

        try {
            String uploadDir = "C:/DiscoDing/upload/profile/";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String fileName = System.currentTimeMillis() + "_" + id + ext;
            String filePath = uploadDir + fileName;

            file.transferTo(new File(filePath));

            String webPath = "/upload/profile/" + fileName;
            memberDao.updateProfileImg(id, webPath);

            return "success";

        } catch (Exception e) {
            e.printStackTrace();
            return "error";
        }
    }

    // 회원탈퇴
    public String deleteAccount(int id) {
        if (memberDao.checkLeader(id)) return "isLeader";
        memberDao.deleteAccount(id);
        return "success";
    }

    // 회원 ID로 조회
    public Member findById(int id) {
        return this.memberDao.findById(id);
    }

    /* =========================
       친구 기능 (Member DTO 확장 방식)
       ========================= */

    /**
     * ✅ 친구 요청 보내기 (keyword = email or nickName)
     * - FriendRequest 테이블에 status=0(요청중) INSERT
     * - 상대에게 개인 알림(FRIEND_REQUEST) 전송
     */
    public String sendFriendRequest(int myId, String keyword) {
        if (myId == 0) return "needLogin";
        if (keyword == null || keyword.trim().isEmpty()) return "emp";

        Member target = memberDao.searchUser(keyword.trim());
        if (target == null) return "notFound";
        if (target.getId() == myId) return "self";

        Member p = new Member();
        p.setFromUserId(myId);
        p.setToUserId(target.getId());

        Member rel = memberDao.findFriendRelation(p);
        if (rel != null) {
            if (rel.getFriendStatus() == 1) return "alreadyFriend";
            if (rel.getFromUserId() == myId) return "alreadyRequested";
            return "incomingExists";
        }

        memberDao.insertFriendRequest(p);

        // ✅ WebSocket 개인 알림 (상대에게)
        Member me = memberDao.findById(myId);
        sendFriendAlarm(
                target.getId(),
                "FRIEND_REQUEST",
                myId,
                (me != null ? me.getNickName() : ("user#" + myId))
        );
        return "success";
    }

    // 친구 목록
    public List<Member> getFriendList(int myId) {
        Member p = new Member();
        p.setFromUserId(myId);

        List<Member> friends = memberDao.findFriends(p);

        // ✅ 온라인 상태 주입 (OnlineUserService 메모리 Set 기준)
        for (Member friend : friends) {
            int otherId = friend.getOtherUserId();
            boolean isOnline = onlineUserService.getOnlineUsers().contains(otherId);
            friend.setOnline(isOnline);
        }

        return friends;
    }

    // 받은 요청 목록
    public List<Member> getReceivedFriendRequests(int myId) {
        Member p = new Member();
        p.setToUserId(myId);
        return memberDao.findReceivedFriendRequests(p);
    }

    // 보낸 요청 목록
    public List<Member> getSentFriendRequests(int myId) {
        Member p = new Member();
        p.setFromUserId(myId);
        return memberDao.findSentFriendRequests(p);
    }

    /**
     * ✅ 친구 요청 수락
     * - FriendRequest status=1(친구)로 변경
     * - 요청 보낸 사람에게 FRIEND_ACCEPT 알림
     */
    public String acceptFriendRequest(int myId, int requestId) {
        Member p = new Member();
        p.setToUserId(myId);
        p.setFriendRequestId(requestId);

        Integer requesterId = memberDao.findRequesterIdByRequest(p);
        if (requesterId == null) return "fail";

        int result = memberDao.acceptFriendRequest(p);
        if (result != 1) return "fail";

        Member me = memberDao.findById(myId);
        sendFriendAlarm(
                requesterId,
                "FRIEND_ACCEPT",
                myId,
                (me != null ? me.getNickName() : ("user#" + myId))
        );

        return "success";
    }

    // 거절 (삭제 처리)
    public String rejectFriendRequest(int myId, int requestId) {
        Member p = new Member();
        p.setToUserId(myId);
        p.setFriendRequestId(requestId);
        return memberDao.rejectFriendRequest(p) == 1 ? "success" : "fail";
    }

    // 취소 (내가 보낸 요청만 삭제)
    public String cancelFriendRequest(int myId, int requestId) {
        Member p = new Member();
        p.setFromUserId(myId);
        p.setFriendRequestId(requestId);
        return memberDao.cancelFriendRequest(p) == 1 ? "success" : "fail";
    }

    // 친구 삭제 (친구 상태에서 양방향 삭제)
    public String deleteFriend(int myId, int targetId) {
        Member p = new Member();
        p.setFromUserId(myId);
        p.setToUserId(targetId);
        return memberDao.deleteFriend(p) == 1 ? "success" : "fail";
    }

    // =========================
    // WebSocket 친구 알림 (private)
    // =========================
    private void sendFriendAlarm(int toUserId, String type, int fromUserId, String fromNickName) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", type); // FRIEND_REQUEST / FRIEND_ACCEPT
        payload.put("fromUserId", fromUserId);
        payload.put("fromNickName", fromNickName);

        // ✅ 보안 강화: user destination으로 전송 (/user/queue/notify)
        sendToUser(toUserId, payload);
    }

    /* =========================
       대결 초대 기능
       - WS 개인 알림을 /user/queue/notify로 통일
       ========================= */

    /**
     * ✅ 대결 초대 보내기
     * - DuelInvite에 status=0(대기)로 저장
     * - 상대에게 DUEL_INVITE 알림 전송
     */
    public String inviteDuel(int myId, int targetId, String message) {
        if (myId == 0) return "needLogin";
        if (targetId == 0) return "badTarget";
        if (myId == targetId) return "self";

        Member p = new Member();
        p.setFromUserId(myId);
        p.setToUserId(targetId);
        p.setDuelMessage(message);

        if (memberDao.countPendingDuelInvite(p) > 0) return "alreadyInvited";

        // insert 후 p.duelInviteId에 생성키가 들어와야 함 (@Options useGeneratedKeys 필요)
        memberDao.insertDuelInvite(p);

        Member me = memberDao.findById(myId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "DUEL_INVITE");
        payload.put("inviteId", p.getDuelInviteId());
        payload.put("fromUserId", myId);
        payload.put("fromNickName", (me != null ? me.getNickName() : ("user#" + myId)));
        payload.put("message", message);

        // ✅ 보안 강화: 개인 큐로 전송
        sendToUser(targetId, payload);

        return "success";
    }

    /**
     * ✅ 대결 초대 수락 (완성 정책 버전)
     *
     * 변경점 요약
     * 1) 여기서는 "플레이어 등록"까지만 한다.
     * 2) 게임 시작(startGame)은 여기서 절대 하지 않는다.
     *    → 실제 게임 시작은 WebSocket에서 READY 2명 확인 후 startGameIfReady로 1회만 처리
     *
     * 기대 흐름
     * - REST: acceptDuelInvite 성공
     * - 개인 알림으로 channelId 전달(DUEL_ACCEPT / DUEL_START)
     * - 프론트가 /topic/channel/{channelId} 구독 + /app/battle/join + /app/battle/ready 진행
     * - 서버가 READY 2명 true일 때 GAME_START 브로드캐스트
     */
    public String acceptDuelInvite(int myId, int inviteId) {
        // ✅ 로그인 체크
        if (myId == 0) return "needLogin";

        // ✅ 수락 대상 검증용 파라미터 객체
        Member p = new Member();
        p.setToUserId(myId);
        p.setDuelInviteId(inviteId);

        // ✅ 누가 초대한 건지 조회(없으면 잘못된 요청)
        Integer inviterId = memberDao.findDuelInviterId(p);
        if (inviterId == null) return "fail";

        // ✅ DB 상태 변경: status=1(수락)
        // - 이미 수락/거절된 초대면 ok != 1이 될 수 있음
        int ok = memberDao.acceptDuelInvite(p);
        if (ok != 1) return "fail";

        // ✅ 현재 정책: channelId = inviteId
        int channelId = inviteId;

        /*
         * ✅ 핵심: 플레이어 등록
         * - addUser는 (정책) 플레이어로 들어오면 관전자 목록에서 제거해주므로
         *   "관전자 -> 플레이어" 전환/겹침 방지가 여기서 자동 처리됨
         *
         * - boolean 리턴 의미:
         *   true  = 신규 등록(처음 들어옴)
         *   false = 이미 등록되어 있음(중복 수락/중복 호출 가능성)
         */
        boolean addedInviter = battleSessionService.addUser(channelId, inviterId);
        boolean addedMe = battleSessionService.addUser(channelId, myId);

        /*
         * ✅ 중요: 여기서 게임 시작 금지!
         * - 과거: accept 즉시 startGame() -> 프론트 구독/입장 전에 isPlaying=true가 되어 꼬임 가능
         * - 개선: READY 2명 확인 후 WS에서 startGameIfReady()로 시작
         */
        // battleSessionService.startGame(channelId); // ❌ 삭제

        /*
         * ✅ 중복 수락/중복 호출 방지 정책
         * - 팀 상황에 따라 2가지 선택:
         *
         * (A) 엄격 모드(추천): 중복이면 alreadyInBattle 반환
         * (B) 관대 모드: 중복이어도 success 처리(프론트가 success만 처리하는 경우)
         *
         * 프론트가 alreadyInBattle 처리를 못 하면 (B)로 바꾸면 됨.
         */
        if (!addedInviter || !addedMe) {
            return "alreadyInBattle";
            // (B) 관대 모드로 바꾸려면:
            // return "success";
        }

        // ✅ 수락한 사람 닉네임 조회(알림용)
        Member me = memberDao.findById(myId);

        // =========================
        // 1) 초대한 사람에게: DUEL_ACCEPT (수락됨 + 채널 정보)
        // =========================
        Map<String, Object> payloadA = new HashMap<>();
        payloadA.put("type", "DUEL_ACCEPT");
        payloadA.put("inviteId", inviteId);
        payloadA.put("channelId", channelId);
        payloadA.put("fromUserId", myId);
        payloadA.put("fromNickName", (me != null ? me.getNickName() : ("user#" + myId)));

        sendToUser(inviterId, payloadA);

        // =========================
        // 2) 수락한 본인에게: DUEL_START (채널 입장 안내)
        // =========================
        Map<String, Object> payloadMe = new HashMap<>();
        payloadMe.put("type", "DUEL_START");
        payloadMe.put("inviteId", inviteId);
        payloadMe.put("channelId", channelId);

        sendToUser(myId, payloadMe);

        return "success";
    }

    /**
     * ✅ 대결 초대 거절
     * - DuelInvite status=2(거절)
     * - 초대한 사람에게 DUEL_REJECT 알림
     */
    public String rejectDuelInvite(int myId, int inviteId) {
        if (myId == 0) return "needLogin";

        Member p = new Member();
        p.setToUserId(myId);
        p.setDuelInviteId(inviteId);

        Integer inviterId = memberDao.findDuelInviterId(p);
        if (inviterId == null) return "fail";

        int ok = memberDao.rejectDuelInvite(p);
        if (ok != 1) return "fail";

        Member me = memberDao.findById(myId);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "DUEL_REJECT");
        payload.put("inviteId", inviteId);
        payload.put("fromUserId", myId);
        payload.put("fromNickName", (me != null ? me.getNickName() : ("user#" + myId)));

        sendToUser(inviterId, payload);

        return "success";
    }
}
