package com.V_Beat.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.V_Beat.dto.FilterResult;

/**
 * ✅ TXT 기반 욕설 필터 (실서비스 1차용)
 * - badwords.txt (classpath) 로드
 * - 메시지에서 매칭되는 구간만 '*'로 마스킹
 * - filtered / filterType = "LOCAL_DB"
 *
 * 특징:
 * - 대소문자 무시(영문)
 * - 문자 사이에 공백/특수문자 끼워넣는 변형 일부 대응 (ex: ㅆ_ㅂ, f*u*c*k)
 */
@Service
public class ProfanityFilterService {

    private static final Logger log = LoggerFactory.getLogger(ProfanityFilterService.class);

    private static final String FILTER_TYPE = "LOCAL_DB";
    private static final char MASK_CHAR = '*';

    // 문자 사이 허용(공백/구두점/언더스코어)
    private static final String SEP = "[\\s\\p{Punct}_]*";

    private static final String WORDLIST = "badwords.txt";

    private volatile List<Pattern> patterns = List.of();

    // ✅ 간단 캐시: 같은 메시지 반복 필터링 비용 절감 (LRU)
    // - 익명 클래스(Serializable 경고) 없애고, 메서드로 size 제한
    private final Map<String, FilterResult> lruCache =
            Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true));

    private static final int CACHE_MAX = 500;

    public ProfanityFilterService() {
        reload();
    }

    /**
     * badwords.txt 다시 로드
     */
    public final void reload() {
        List<String> words = loadWords(WORDLIST);

        // ✅ 긴 단어부터 매칭 (부분단어에 먼저 걸려 마스킹 깨짐 방지)
        words.sort((a, b) -> Integer.compare(b.length(), a.length()));

        List<Pattern> ps = new ArrayList<>(words.size());
        for (String w : words) {
            Pattern p = buildLoosePattern(w);
            if (p != null) ps.add(p);
        }

        this.patterns = Collections.unmodifiableList(ps);

        // 캐시 초기화
        synchronized (lruCache) {
            lruCache.clear();
        }

        // ✅ 로딩 확인용 1줄
        log.info("[PROFANITY] badwords loaded: {} (file={})", this.patterns.size(), WORDLIST);
    }

    public FilterResult mask(String original) {
        if (original == null || original.isBlank()) return FilterResult.pass(original);

        // 캐시 hit
        FilterResult cached;
        synchronized (lruCache) {
            cached = lruCache.get(original);
        }
        if (cached != null) return cached;

        String masked = applyPatterns(original);
        boolean filtered = !Objects.equals(masked, original);

        String filterType = filtered ? FILTER_TYPE : null;
        FilterResult fr = new FilterResult(masked, filtered, filterType);

        // cache put + LRU 정리
        synchronized (lruCache) {
            lruCache.put(original, fr);
            trimCacheIfNeeded();
        }
        return fr;
    }

    // -------------------------
    // internal
    // -------------------------

    private void trimCacheIfNeeded() {
        int over = lruCache.size() - CACHE_MAX;
        if (over <= 0) return;

        Iterator<String> it = lruCache.keySet().iterator(); // accessOrder=true라 LRU부터 나옴
        while (over-- > 0 && it.hasNext()) {
            it.next();
            it.remove();
        }
    }

    private List<String> loadWords(String classpathName) {
        List<String> out = new ArrayList<>();
        try {
            ClassPathResource res = new ClassPathResource(classpathName);
            if (!res.exists()) {
                log.warn("[PROFANITY] wordlist not found: {}", classpathName);
                return out;
            }

            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(res.getInputStream(), StandardCharsets.UTF_8))) {

                String line;
                while ((line = br.readLine()) != null) {
                    String w = line.trim();
                    if (w.isEmpty()) continue;
                    if (w.startsWith("#")) continue; // 주석 허용
                    out.add(w);
                }
            }
        } catch (Exception e) {
            // 로딩 실패해도 서비스 죽지 않게 + 원인 로그는 남김
            log.warn("[PROFANITY] failed to load wordlist: {} ({})", classpathName, e.toString());
        }
        return out;
    }

    private Pattern buildLoosePattern(String word) {
        if (word == null) return null;
        String w = word.trim();
        if (w.isEmpty()) return null;

        // 각 글자를 escape하고 SEP로 연결
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < w.length(); i++) {
            String ch = Pattern.quote(String.valueOf(w.charAt(i)));
            if (i > 0) sb.append(SEP);
            sb.append(ch);
        }

        return Pattern.compile(sb.toString(), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    private String applyPatterns(String original) {
        List<Pattern> ps = this.patterns;
        if (ps.isEmpty()) return original;

        List<int[]> ranges = new ArrayList<>();

        for (Pattern p : ps) {
            Matcher m = p.matcher(original);
            while (m.find()) {
                int s = m.start();
                int e = m.end(); // exclusive
                if (e > s) ranges.add(new int[]{s, e});
            }
        }

        if (ranges.isEmpty()) return original;

        // 겹치는 구간 병합
        ranges.sort(Comparator.comparingInt(a -> a[0]));
        List<int[]> merged = new ArrayList<>();
        int[] cur = ranges.get(0);

        for (int i = 1; i < ranges.size(); i++) {
            int[] nxt = ranges.get(i);
            if (nxt[0] <= cur[1]) {
                cur[1] = Math.max(cur[1], nxt[1]);
            } else {
                merged.add(cur);
                cur = nxt;
            }
        }
        merged.add(cur);

        // 뒤에서부터 replace
        StringBuilder sb = new StringBuilder(original);
        for (int i = merged.size() - 1; i >= 0; i--) {
            int s = merged.get(i)[0];
            int e = merged.get(i)[1];
            int len = e - s;
            if (len <= 0) continue;
            sb.replace(s, e, String.valueOf(MASK_CHAR).repeat(len));
        }

        return sb.toString();
    }
}
