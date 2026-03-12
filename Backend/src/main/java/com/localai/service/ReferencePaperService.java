package com.localai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@Service
public class ReferencePaperService {

    private final List<ReferencePaper> papers;
    private static final Set<String> SHORT_TOKENS = Set.of("ai", "ml", "llm", "nlp", "rl", "cv");
    private static final Set<String> GENERIC_TOKENS = Set.of(
            "reference", "references", "paper", "papers", "research", "related", "work",
            "survey", "literature", "review", "citation", "cite", "project", "report",
            "give", "provide", "list", "latest", "recent", "please", "need",
            "for", "on", "of", "in", "to", "and", "or", "the", "a", "an"
    );
    private static final Pattern LIST_ITEM_PATTERN = Pattern.compile("^\\s*\\d+\\s*\\.\\s*");

    public ReferencePaperService(ObjectMapper objectMapper) {
        this.papers = loadPapers(objectMapper);
    }

    public boolean isReferenceRequest(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return false;
        }
        String lower = prompt.toLowerCase(Locale.ROOT);
        return lower.contains("reference paper") ||
                lower.contains("references paper") ||
                lower.contains("reference papers") ||
                lower.contains("references") && (lower.contains("paper") || lower.contains("project")) ||
                lower.contains("related work") ||
                lower.contains("literature review") ||
                lower.contains("survey paper") ||
                lower.contains("citation") ||
                lower.contains("cite");
    }

    public int extractRequestedCount(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return 10;
        }
        String lower = prompt.toLowerCase(Locale.ROOT);
        String[] tokens = lower.split("\\s+");
        for (int i = 0; i < tokens.length; i++) {
            if (tokens[i].matches("\\d{1,2}")) {
                int value = Integer.parseInt(tokens[i]);
                if (value >= 1) {
                    return Math.min(value, 25);
                }
            }
        }
        return 10;
    }

    public List<ReferencePaper> search(String query, int yearFrom, int yearTo, int limit) {
        return search(query, yearFrom, yearTo, limit, Set.of());
    }

    public List<ReferencePaper> search(String query, int yearFrom, int yearTo, int limit, Set<String> excludeTitles) {
        if (papers.isEmpty()) {
            return List.of();
        }

        QueryIntent intent = parseIntent(query);
        Set<String> keywords = tokenize(query);
        Set<String> normalizedExclude = normalizeTitleSet(excludeTitles);
        List<ScoredPaper> scored = new ArrayList<>();
        for (ReferencePaper paper : papers) {
            if (paper.year < yearFrom || paper.year > yearTo) {
                continue;
            }
            if (intent.wantsMultimodal() && !isMultimodalPaper(paper)) {
                continue;
            }
            if (intent.wantsLLM() && !isLLMPaper(paper)) {
                continue;
            }
            if (intent.hasExplicitDomain() && !intent.wantsMultimodal() && isMultimodalPaper(paper)) {
                continue;
            }
            if (!normalizedExclude.isEmpty()) {
                String normalizedTitle = normalizeTitle(paper.title);
                if (!normalizedTitle.isEmpty() && normalizedExclude.contains(normalizedTitle)) {
                    continue;
                }
            }
            int score = scorePaper(paper, keywords);
            if (!keywords.isEmpty() && score <= 0) {
                continue;
            }
            scored.add(new ScoredPaper(paper, score));
        }

        scored.sort(Comparator
                .comparingInt(ScoredPaper::score).reversed()
                .thenComparingInt(p -> p.paper.year).reversed()
                .thenComparing(p -> p.paper.title, String.CASE_INSENSITIVE_ORDER));

        return scored.stream()
                .map(scoredPaper -> scoredPaper.paper)
                .limit(limit)
                .collect(Collectors.toList());
    }

    public boolean isReferenceFollowUpRequest(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return false;
        }
        String lower = prompt.toLowerCase(Locale.ROOT);
        if (isReferenceRequest(lower)) {
            return false;
        }

        boolean mentionsReference = lower.contains("paper") ||
                lower.contains("papers") ||
                lower.contains("reference") ||
                lower.contains("references") ||
                lower.contains("citation") ||
                lower.contains("cite");
        if (mentionsReference) {
            return true;
        }

        String[] tokens = lower.trim().split("\\s+");
        if (tokens.length <= 4) {
            return lower.contains("more") || lower.contains("another") || lower.contains("next");
        }
        return false;
    }

    public boolean isReferenceResponse(String response) {
        if (response == null || response.isBlank()) {
            return false;
        }
        String lower = response.toLowerCase(Locale.ROOT);
        return lower.contains("reference papers for:");
    }

    public Set<String> extractTitlesFromResponse(String response) {
        if (response == null || response.isBlank()) {
            return Set.of();
        }
        String[] lines = response.split("\\r?\\n");
        Set<String> titles = new HashSet<>();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!LIST_ITEM_PATTERN.matcher(line).find()) {
                continue;
            }
            for (int j = i + 1; j < lines.length; j++) {
                String candidate = lines[j].trim();
                if (candidate.isEmpty()) {
                    continue;
                }
                String lower = candidate.toLowerCase(Locale.ROOT);
                if (lower.startsWith("summary:") || lower.startsWith("url:")) {
                    continue;
                }
                titles.add(normalizeTitle(candidate));
                break;
            }
        }
        return titles;
    }

    public String formatAsMarkdown(String title, List<ReferencePaper> results, int yearFrom, int yearTo) {
        StringBuilder out = new StringBuilder();
        out.append(title).append("\n");
        out.append("Years: ").append(yearFrom).append("-").append(yearTo).append("\n\n");

        if (results.isEmpty()) {
            out.append("No offline papers matched the query. ");
            out.append("Add more entries to `reference_papers.json` to expand the offline library.");
            return out.toString();
        }

        int index = 1;
        for (ReferencePaper paper : results) {
            out.append(index).append(". ");
            out.append(String.join(", ", paper.authors)).append("\n");

            String cleanTitle = paper.title == null ? "" : paper.title.trim();
            if (!cleanTitle.endsWith(".")) {
                cleanTitle = cleanTitle + ".";
            }
            out.append(cleanTitle).append("\n");

            out.append(paper.venue).append(", ").append(paper.year).append(".\n");
            if (paper.url != null && !paper.url.isBlank()) {
                out.append("URL: ").append(paper.url).append("\n");
            }
            out.append("Summary: ").append(paper.summary).append("\n\n");
            index++;
        }

        return out.toString().trim();
    }

    private List<ReferencePaper> loadPapers(ObjectMapper objectMapper) {
        try (InputStream input = new ClassPathResource("reference_papers.json").getInputStream()) {
            return objectMapper.readValue(input, new TypeReference<List<ReferencePaper>>() {});
        } catch (Exception e) {
            System.err.println("Failed to load reference_papers.json: " + e.getMessage());
            return List.of();
        }
    }

    private int scorePaper(ReferencePaper paper, Set<String> queryTokens) {
        if (queryTokens.isEmpty()) {
            return 1;
        }

        int score = 0;
        for (String token : queryTokens) {
            if (token.isBlank()) {
                continue;
            }
            if (containsIgnoreCase(paper.title, token)) {
                score += 5;
            }
            if (paper.keywords != null && paper.keywords.stream().anyMatch(k -> containsIgnoreCase(k, token))) {
                score += 4;
            }
            if (containsIgnoreCase(paper.summary, token)) {
                score += 2;
            }
            if (containsIgnoreCase(paper.venue, token)) {
                score += 1;
            }
        }
        return score;
    }

    private boolean containsIgnoreCase(String text, String token) {
        if (text == null || token == null) {
            return false;
        }
        return text.toLowerCase(Locale.ROOT).contains(token.toLowerCase(Locale.ROOT));
    }

    private Set<String> normalizeTitleSet(Set<String> titles) {
        if (titles == null || titles.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new HashSet<>();
        for (String title : titles) {
            String cleaned = normalizeTitle(title);
            if (!cleaned.isEmpty()) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "";
        }
        String cleaned = title.trim()
                .replaceAll("^\"|\"$", "")
                .replaceAll("^[']|[']$", "")
                .replaceAll("[`]", "")
                .replaceAll("\\s+", " ")
                .replaceAll("\\.$", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        return cleaned;
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        String normalized = text.toLowerCase(Locale.ROOT)
                .replaceAll("ai\\s*/\\s*ml", "aiml")
                .replaceAll("ai\\s*-\\s*ml", "aiml")
                .replaceAll("[^a-z0-9\\s]", " ");
        if (normalized.contains("multi modal")) {
            normalized = normalized.replace("multi modal", "multimodal");
        }
        if (normalized.contains("vision language")) {
            normalized = normalized.replace("vision language", "vision-language");
        }
        String[] parts = normalized.split("\\s+");
        Set<String> tokens = new HashSet<>();
        for (String part : parts) {
            if (part.isBlank() || GENERIC_TOKENS.contains(part)) {
                continue;
            }
            if ("aiml".equals(part)) {
                tokens.add("ai");
                tokens.add("ml");
                tokens.add("artificial");
                tokens.add("intelligence");
                tokens.add("machine");
                tokens.add("learning");
                continue;
            }
            if (part.length() > 2 || SHORT_TOKENS.contains(part)) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private QueryIntent parseIntent(String query) {
        if (query == null || query.isBlank()) {
            return new QueryIntent(false, false, false, false);
        }
        String lower = query.toLowerCase(Locale.ROOT);
        boolean wantsMultimodal = lower.contains("multimodal") ||
                lower.contains("vision-language") ||
                lower.contains("vision language") ||
                lower.contains("vlm") ||
                lower.contains("image-text") ||
                lower.contains("vision") ||
                lower.contains("image") ||
                lower.contains("video");
        boolean wantsLLM = lower.contains("llm") ||
                lower.contains("large language model") ||
                lower.contains("language model");
        boolean wantsNeural = lower.contains("neural network") ||
                lower.contains("neural networks") ||
                lower.contains("ann");
        boolean wantsAIML = lower.contains("aiml") ||
                lower.contains("ai/ml") ||
                (lower.contains("ai") && lower.contains("ml")) ||
                lower.contains("artificial intelligence") ||
                lower.contains("machine learning");
        return new QueryIntent(wantsMultimodal, wantsLLM, wantsNeural, wantsAIML);
    }

    private boolean isMultimodalPaper(ReferencePaper paper) {
        if (paper.keywords == null || paper.keywords.isEmpty()) {
            return false;
        }
        return paper.keywords.stream().anyMatch(keyword -> {
            String lower = keyword == null ? "" : keyword.toLowerCase(Locale.ROOT);
            return lower.contains("multimodal") ||
                    lower.contains("vision-language") ||
                    lower.contains("image-text") ||
                    lower.contains("vlm");
        });
    }

    private boolean isLLMPaper(ReferencePaper paper) {
        if (paper == null) {
            return false;
        }
        if (paper.keywords != null && paper.keywords.stream().anyMatch(this::isLLMKeyword)) {
            return true;
        }
        return containsAnyIgnoreCase(paper.title, LLM_KEYWORDS) ||
                containsAnyIgnoreCase(paper.summary, LLM_KEYWORDS) ||
                containsAnyIgnoreCase(paper.venue, LLM_KEYWORDS);
    }

    private static final List<String> LLM_KEYWORDS = List.of(
            "llm",
            "large language model",
            "language model",
            "gpt",
            "chatgpt",
            "instruction-tuned",
            "instruction tuned",
            "decoder-only",
            "decoder only"
    );

    private boolean isLLMKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return false;
        }
        String lower = keyword.toLowerCase(Locale.ROOT);
        for (String token : LLM_KEYWORDS) {
            if (lower.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAnyIgnoreCase(String text, List<String> tokens) {
        if (text == null || text.isBlank() || tokens == null || tokens.isEmpty()) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        for (String token : tokens) {
            if (token != null && !token.isBlank() && lower.contains(token)) {
                return true;
            }
        }
        return false;
    }

    public static class ReferencePaper {
        public String title;
        public List<String> authors;
        public int year;
        public String venue;
        public String publisher;
        public String summary;
        public String url;
        public String doi;
        public List<String> keywords;
    }

    private record ScoredPaper(ReferencePaper paper, int score) {}
    private record QueryIntent(boolean wantsMultimodal, boolean wantsLLM, boolean wantsNeural, boolean wantsAIML) {
        boolean hasExplicitDomain() {
            return wantsMultimodal || wantsLLM || wantsNeural || wantsAIML;
        }
    }
}
