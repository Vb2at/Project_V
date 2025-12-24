package com.V_Beat.service;

import java.io.File;
import java.util.List;
import java.util.Random;
import java.util.HashMap;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.V_Beat.dao.MemberDao;
import com.V_Beat.dto.Member;

@Service
public class MemberService {

	private MemberDao memberDao;
	private BCryptPasswordEncoder passwordEncoder; // 비밀번호 암호화
	private EmailService emailService;
	private SimpMessagingTemplate messagingTemplate;
	private OnlineUserService onlineUserService;
	// 대결 방(채널) 접속자 상태를 메모리로 관리
	private BattleSessionService battleSessionService;


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
		// 비밀번호 BCrypt 암호화 (단방향 해시)
		String encodePW = passwordEncoder.encode(member.getLoginPw());
		member.setLoginPw(encodePW);

		// DB INSERT
		this.memberDao.join(member);
	}

	// 닉네임으로 회원 조회
	public Member findByNickName(String nickName) {
		return this.memberDao.findByNickName(nickName);
	}

	// 로그인 처리
	public Member login(String email, String loginPw) {
	    // 1. 이메일로 회원 조회
	    Member member = this.memberDao.findByEmail(email);
	    if (member == null) {
	        return null; // 존재하지 않는 이메일
	    }

	    // 2. 소셜 로그인 회원은 일반 로그인 불가
	    if (member.getLoginType() != 0) {
	        return null; // 소셜 로그인 계정
	    }

	    // 3. BCrypt로 비밀번호 비교
	    if (passwordEncoder.matches(loginPw, member.getLoginPw())) {
	        return member; // 로그인 성공
	    }

	    return null; // 비밀번호 불일치
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
		// 8자리 임시 비밀번호 생성
		String tempPw = generateTempPassword();

		// BCrypt로 암호화
		String encodedPw = passwordEncoder.encode(tempPw);

		// 이메일로 회원 조회
		Member member = this.memberDao.findByEmail(email);

		// DB에 암호화된 임시 비밀번호로 업데이트
		this.memberDao.updatePw(member.getId(), encodedPw);

		// 평문 임시 비밀번호를 이메일로 발송
		this.emailService.sendTempPw(email, tempPw);
	}

	// 닉네임 변경
	public String changeNickName(int id, String newNickName) {
		// 공백 검증
		if (newNickName == null || newNickName.trim().isEmpty()) {
			return "emp";
		}
		// 중복 체크
		Member dupNickname = memberDao.findByNickName(newNickName);
		if (dupNickname != null) {
			return "dup";
		}
		// 변경 실행
		memberDao.updateNickName(id, newNickName.trim());
		return "success";
	}

	// 비밀번호 변경
	public String changePassword(int id, String loginPw, String newPw) {
		// 공백 검증
		if (loginPw == null || newPw == null || loginPw.trim().isEmpty() || newPw.trim().isEmpty()) {
			return "emp";
		}
		// 현재 비밀번호 확인
		Member member = memberDao.findById(id);
		if (!passwordEncoder.matches(loginPw, member.getLoginPw())) {
			return "diff";
		}
		// 새로 박은 비밀번호 암호화
		String encodedNewPw = passwordEncoder.encode(newPw);
		// 비밀번호 저장
		memberDao.updatePassword(id, encodedNewPw);

		return "success";
	}

	public String updateProfileImg(int id, MultipartFile file) {
		// 파일 검증
		if (file == null || file.isEmpty()) {
			return "emp";
		}
		// 파일 확장자 검증
		String originName = file.getOriginalFilename();
		String ext = originName.substring(originName.lastIndexOf("."));
		if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)$")) {
			return "noneType";
		}

		try {

			// 파일 저장경로 생성
			String uploadDir = "C:/DiscoDing/upload/profile/";
			File dir = new File(uploadDir);
			if (!dir.exists()) {
				dir.mkdirs();
			}
			// 파일명 생성
			String fileName = System.currentTimeMillis() + "_" + id + ext;
			String filePath = uploadDir + fileName;

			file.transferTo(new File(filePath));

			// DB 업데이트
			String webPath = "/upload/profile/" + fileName;
			memberDao.updateProfileImg(id, webPath);

			return "success";

		} catch (Exception e) {
			e.printStackTrace();
			return "error";
		}
	}

	public String deleteAccount(int id) {
		if (memberDao.checkLeader(id)) {
			return "isLeader";
		}
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

	// 친구 요청 보내기 (keyword = email or nickName)
	public String sendFriendRequest(int myId, String keyword) {
	    if (myId == 0) return "needLogin";
	    if (keyword == null || keyword.trim().isEmpty()) return "emp";

	    Member target = memberDao.searchUser(keyword.trim());
	    if (target == null) return "notFound";
	    if (target.getId() == myId) return "self";

	    // 관계 확인용 Member(임시 파라미터)
	    Member p = new Member();
	    p.setFromUserId(myId);
	    p.setToUserId(target.getId());

	    Member rel = memberDao.findFriendRelation(p);
	    if (rel != null) {
	        if (rel.getFriendStatus() == 1) return "alreadyFriend";
	        // 요청중(0)
	        if (rel.getFromUserId() == myId) return "alreadyRequested";
	        return "incomingExists"; // 상대가 나에게 먼저 요청한 상태
	    }

	    memberDao.insertFriendRequest(p);
	    
	 // WebSocket 알림 (상대에게)
	    Member me = memberDao.findById(myId);
	    sendFriendAlarm(
	        target.getId(),
	        "FRIEND_REQUEST",
	        myId,
	        me.getNickName()
	    );
	    return "success";
	}

	// 친구 목록
	public List<Member> getFriendList(int myId) {
	    Member p = new Member();
	    p.setFromUserId(myId); // 내 id를 fromUserId 자리에 넣어서 조회 기준으로 사용
	    
	    List<Member> friends = memberDao.findFriends(p);
	    
	    // 온라인 상태 주입
	    for (Member friend : friends) {
	        int otherId = friend.getOtherUserId(); // 상대방 id
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

	// 수락
	public String acceptFriendRequest(int myId, int requestId) {
	    Member p = new Member();
	    p.setToUserId(myId);
	    p.setFriendRequestId(requestId);

	    // 1️⃣ 요청 보낸 사람 id 조회
	    Integer requesterId = memberDao.findRequesterIdByRequest(p);
	    if (requesterId == null) return "fail";

	    // 2️⃣ 수락 처리
	    int result = memberDao.acceptFriendRequest(p);
	    if (result != 1) return "fail";

	    // 3️⃣ WebSocket 알림 (요청 보낸 사람에게)
	    Member me = memberDao.findById(myId);
	    sendFriendAlarm(
	        requesterId,
	        "FRIEND_ACCEPT",
	        myId,
	        me.getNickName()
	    );

	    return "success";
	}


	// 거절
	public String rejectFriendRequest(int myId, int requestId) {
	    Member p = new Member();
	    p.setToUserId(myId);
	    p.setFriendRequestId(requestId);
	    return memberDao.rejectFriendRequest(p) == 1 ? "success" : "fail";
	}

	// 취소
	public String cancelFriendRequest(int myId, int requestId) {
	    Member p = new Member();
	    p.setFromUserId(myId);
	    p.setFriendRequestId(requestId);
	    return memberDao.cancelFriendRequest(p) == 1 ? "success" : "fail";
	}

	// 친구 삭제 (상대 userId 필요)
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

	    // 개인 채널로 전송
	    messagingTemplate.convertAndSend("/topic/user." + toUserId, payload);
	}
	/* =========================
	   대결 초대 기능 (새 파일 없이 MemberService에 추가)
	   - DB: DuelInvite 테이블
	   - DAO: MemberDao에 duel 관련 SQL 5개 있어야 함
	   - WS: /topic/user.{id} 개인 채널로 알림
	   ========================= */

	/*
	 * 대결 초대 보내기
	 *
	 * - DuelInvite 테이블에 status=0(대기)로 저장
	 * - 상대에게 WebSocket "DUEL_INVITE" 알림 전송
	 */
	public String inviteDuel(int myId, int targetId, String message) {
	    if (myId == 0) return "needLogin";
	    if (targetId == 0) return "badTarget";
	    if (myId == targetId) return "self";

	    Member p = new Member();
	    p.setFromUserId(myId);
	    p.setToUserId(targetId);
	    p.setDuelMessage(message);

	    // 대기 초대 중복 방지
	    if (memberDao.countPendingDuelInvite(p) > 0) return "alreadyInvited";

	    // insert 후 p.duelInviteId에 생성키가 들어와야 함 (@Options useGeneratedKeys 필요)
	    memberDao.insertDuelInvite(p);

	    Member me = memberDao.findById(myId);

	    Map<String, Object> payload = new HashMap<>();
	    payload.put("type", "DUEL_INVITE");
	    payload.put("inviteId", p.getDuelInviteId());
	    payload.put("fromUserId", myId);
	    payload.put("fromNickName", me.getNickName());
	    payload.put("message", message);

	    messagingTemplate.convertAndSend("/topic/user." + targetId, payload);

	    return "success";
	}

	/*
	 * 대결 초대 수락
	 *
	 * - DuelInvite status=1(수락)로 변경
	 * - channelId는 inviteId를 그대로 사용
	 * - BattleSessionService에 두 플레이어 등록
	 * - 초대한 사람에게 "DUEL_ACCEPT" 알림
	 * - 수락한 본인에게 "DUEL_START" 알림 (프론트 단순화용)
	 */
	public String acceptDuelInvite(int myId, int inviteId) {
	    if (myId == 0) return "needLogin";

	    Member p = new Member();
	    p.setToUserId(myId);
	    p.setDuelInviteId(inviteId);

	    // 대기 상태인 초대만 수락 가능 + 초대한 사람 찾기
	    Integer inviterId = memberDao.findDuelInviterId(p);
	    if (inviterId == null) return "fail";

	    int ok = memberDao.acceptDuelInvite(p);
	    if (ok != 1) return "fail";

	    int channelId = inviteId;

	    // 방 세션 등록 (수락 순간 두 명을 방에 올려둠)
	    battleSessionService.addUser(channelId, inviterId);
	    battleSessionService.addUser(channelId, myId);
	    
	    battleSessionService.startGame(channelId);

	    Member me = memberDao.findById(myId);

	    Map<String, Object> payloadA = new HashMap<>();
	    payloadA.put("type", "DUEL_ACCEPT");
	    payloadA.put("inviteId", inviteId);
	    payloadA.put("channelId", channelId);
	    payloadA.put("fromUserId", myId);
	    payloadA.put("fromNickName", me.getNickName());

	    messagingTemplate.convertAndSend("/topic/user." + inviterId, payloadA);

	    Map<String, Object> payloadMe = new HashMap<>();
	    payloadMe.put("type", "DUEL_START");
	    payloadMe.put("inviteId", inviteId);
	    payloadMe.put("channelId", channelId);

	    messagingTemplate.convertAndSend("/topic/user." + myId, payloadMe);

	    return "success";
	}

	/*
	 * 대결 초대 거절
	 *
	 * - DuelInvite status=2(거절)로 변경
	 * - 초대한 사람에게 "DUEL_REJECT" 알림
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
	    payload.put("fromNickName", me.getNickName());

	    messagingTemplate.convertAndSend("/topic/user." + inviterId, payload);

	    return "success";
	}


}