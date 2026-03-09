package com.localai.controller;

import com.localai.model.ChatHistory;
import com.localai.repository.ChatHistoryRepository;
import com.localai.security.JwtAuthenticationFilter;
import com.localai.service.OllamaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
}, allowCredentials = "true")
public class ChatController {

    private final OllamaService ollamaService;
    private final ChatHistoryRepository chatHistoryRepository;

    public ChatController(OllamaService ollamaService, ChatHistoryRepository chatHistoryRepository) {
        this.ollamaService = ollamaService;
        this.chatHistoryRepository = chatHistoryRepository;
    }

    @GetMapping("/test")
    public String test() {
        return "ChatController is working!";
    }

    @GetMapping("/debug-token")
    public Map<String, Object> debugToken(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           HttpServletRequest request) {
        Map<String, Object> debugInfo = new HashMap<>();

        if (authHeader == null || authHeader.isEmpty()) {
            debugInfo.put("error", "No Authorization header found");
            debugInfo.put("status", "missing_header");
            return debugInfo;
        }

        if (!authHeader.startsWith("Bearer ")) {
            debugInfo.put("error", "Invalid format - expected 'Bearer <token>'");
            debugInfo.put("status", "invalid_format");
            return debugInfo;
        }

        String token = authHeader.substring(7);
        debugInfo.put("tokenPresent", true);
        debugInfo.put("tokenLength", token.length());
        debugInfo.put("authenticatedUserId", request.getAttribute(JwtAuthenticationFilter.AUTH_USER_ID_ATTR));
        debugInfo.put("authenticatedUsername", request.getAttribute(JwtAuthenticationFilter.AUTH_USERNAME_ATTR));
        return debugInfo;
    }

    @GetMapping("/models")
    public Map<String, Object> getAvailableModels() {
        List<String> models = ollamaService.getAvailableModels();
        return Map.of("models", models);
    }

    @GetMapping("/models/{modelName}")
    public Map<String, Object> getModelInfo(@PathVariable String modelName) {
        return ollamaService.getModelInfo(modelName);
    }

    @PostMapping
    public Map<String, Object> chat(@RequestBody Map<String, Object> request,
                                    HttpServletRequest httpServletRequest) {
        String authenticatedUserId = getAuthenticatedUserId(httpServletRequest);
        if (authenticatedUserId == null || authenticatedUserId.isBlank()) {
            return errorResponse("Unauthorized", null);
        }

        String userMessage = (String) request.get("message");
        String model = (String) request.get("model");
        String conversationId = (String) request.get("conversationId");
        String requestUserId = (String) request.get("userId");
        String imageData = (String) request.get("imageData");
        String fileData = (String) request.get("file");
        String fileName = (String) request.get("fileName");
        String fileType = (String) request.get("fileType");
        Long fileSize = toLong(request.get("fileSize"));
        String keyword = (String) request.get("keyword");

        if (requestUserId != null && !requestUserId.isBlank() && !requestUserId.equals(authenticatedUserId)) {
            System.out.println("Ignoring mismatched request userId: " + requestUserId);
        }

        if (model == null || model.isBlank()) {
            model = "qwen2.5:1.5b";
        }

        if (conversationId == null || conversationId.isBlank()) {
            conversationId = UUID.randomUUID().toString();
        }

        // Extract file content if file is provided
        String fileContent = null;
        if (fileData != null && !fileData.isEmpty()) {
            fileContent = ollamaService.extractFileContent(fileData);
            System.out.println("File '" + fileName + "' extracted. Content length: " + 
                             (fileContent != null ? fileContent.length() : "0"));
        }

        if (userMessage == null || userMessage.trim().isEmpty()) {
            if (imageData != null && !imageData.isEmpty()) {
                userMessage = "Analyze this image and describe it in detail.";
            } else if (fileContent != null && !fileContent.isEmpty()) {
                userMessage = "Please analyze this document.";
            } else if (fileData != null && !fileData.isEmpty()) {
                String safeFileName = fileName != null && !fileName.isBlank() ? fileName : "attachment";
                userMessage = "I uploaded a file named \"" + safeFileName + "\". Please help me with it.";
            } else {
                return errorResponse("Message is required", conversationId);
            }
        }

        if (keyword == null || keyword.trim().isEmpty()) {
            keyword = buildSimpleKeyword(userMessage);
        }

        // Get AI response with file content support
        String aiResponse = ollamaService.chat(model, userMessage, imageData, fileContent);

        // Save chat history asynchronously (non-blocking) - response sent immediately
        saveChatHistoryAsync(
                authenticatedUserId,
                conversationId,
                userMessage,
                aiResponse,
                imageData,
                fileData,
                fileName,
                fileType,
                fileSize,
                keyword
        );

        Map<String, Object> response = new HashMap<>();
        response.put("response", aiResponse);
        response.put("conversationId", conversationId);
        response.put("status", "success");
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    /**
     * Async method to save chat history without blocking the response
     */
    @Async
    public void saveChatHistoryAsync(
            String userId,
            String conversationId,
            String userMessage,
            String aiResponse,
            String imageData,
            String fileData,
            String fileName,
            String fileType,
            Long fileSize,
            String keyword
    ) {
        try {
            ChatHistory chatHistory = new ChatHistory(
                    userId,
                    conversationId,
                    userMessage,
                    aiResponse,
                    imageData,
                    fileData,
                    fileName,
                    fileType,
                    fileSize,
                    keyword
            );
            chatHistoryRepository.save(chatHistory);
            System.out.println("Chat history saved asynchronously for conversation: " + conversationId);
        } catch (Exception e) {
            System.err.println("Failed to save ChatHistory asynchronously: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @GetMapping
    public List<ChatHistory> getChatHistory(@RequestParam(required = false) String userId,
                                            HttpServletRequest httpServletRequest) {
        String authenticatedUserId = getAuthenticatedUserId(httpServletRequest);
        if (authenticatedUserId == null || authenticatedUserId.isBlank()) {
            return new ArrayList<>();
        }

        if (userId != null && !userId.isBlank() && !userId.equals(authenticatedUserId)) {
            System.out.println("Ignoring mismatched query userId: " + userId);
        }

        return chatHistoryRepository.findByUserId(authenticatedUserId);
    }

    private String getAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTH_USER_ID_ATTR);
        return value instanceof String ? (String) value : null;
    }

    private Map<String, Object> errorResponse(String error, String conversationId) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", error);
        response.put("conversationId", conversationId);
        response.put("status", "error");
        return response;
    }

    private String buildSimpleKeyword(String message) {
        if (message == null || message.trim().isEmpty()) {
            return "New Chat";
        }

        String normalized = message
                .replaceAll("[^a-zA-Z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isEmpty()) {
            return "New Chat";
        }

        String lower = normalized.toLowerCase();
        if (lower.contains("analyze this image")) {
            return "Image Analysis";
        }

        Set<String> stopWords = Set.of(
                "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "at",
                "is", "are", "was", "were", "be", "this", "that", "it", "with",
                "about", "please", "can", "you", "me", "my", "i"
        );

        
        String[] words = normalized.split(" ");
        List<String> selectedWords = new ArrayList<>();
        for (String word : words) {
            if (selectedWords.size() == 4) {
                break;
            }

            String lowerWord = word.toLowerCase();
            if (word.length() > 2 && !stopWords.contains(lowerWord)) {
                selectedWords.add(capitalizeWord(word));
            }
        }

        if (selectedWords.isEmpty()) {
            for (int i = 0; i < words.length && i < 4; i++) {
                selectedWords.add(capitalizeWord(words[i]));
            }
        }

        return String.join(" ", selectedWords);
    }

    private String capitalizeWord(String word) {
        if (word == null || word.isEmpty()) {
            return "";
        }
        if (word.length() == 1) {
            return word.toUpperCase();
        }
        return word.substring(0, 1).toUpperCase() + word.substring(1).toLowerCase();
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
