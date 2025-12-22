package com.V_Beat.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import com.V_Beat.dto.Req;


@Controller
public class HomeController {

	private final Req req;
	
	public HomeController(Req req) {
		this.req = req;
	}
	
    // ===== 루트 경로 - 로그인 여부에 따라 분기 =====
    @GetMapping("/")
    public String showRoot() {
        // 로그인 했으면 메인 페이지로
        if (req.getLoginMemberId() != 0) {
            return "redirect:/user/home/main";
        }
        // 로그인 안 했으면 랜딩 페이지로
        return "user/home/landing";
    }

    // ===== 메인 페이지 (로그인 후) =====
    @GetMapping("/user/home/main")
    public String showMain(Model model) {
        model.addAttribute("pageTitle", "DiscoDing - 협업 코드 에디터");
        return "user/home/main";
    }
}