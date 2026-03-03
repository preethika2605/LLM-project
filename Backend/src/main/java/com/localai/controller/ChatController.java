package com.localai.controller;

import com.localai.service.OllamaService;
import com.localai.model.ChatHistory;
import com.localai.repository.ChatHistoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000", "http://localhost:5174", "http://127.0.0.1:5174"}, allowCredentials = "true")
public class ChatController {

    private final OllamaService ollamaService;
    private final ChatHistoryRepository chatHistoryRepository;

    public ChatController(OllamaService ollamaService,
            ChatHistoryRepository chatHistoryRepository) {
        System.out.println("ChatController initialized!");
        this.ollamaService = ollamaService;
        this.chatHistoryRepository = chatHistoryRepository;
    }

    @GetMapping("/test")
    public String test() {
        return "ChatController is working!";
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
    public Map<String, String> chat(@RequestBody Map<String, String> request) {

        System.out.println("\n========== INCOMING CHAT REQUEST ==========");
        System.out.println("📨 Request received at: " + java.time.LocalDateTime.now());

        String userMessage = request.get("message");
        String model = request.get("model");
        String conversationId = request.get("conversationId");
        String userId = request.get("userId");

        System.out.println("👤 User ID: " + userId);
        System.out.println("🤖 Model: " + model);
        System.out.println("💬 User Message: " + userMessage);
        System.out.println("🆔 Conversation ID: " + conversationId);

        if (model == null || model.isEmpty()) {
            model = "qwen2.5:1.5b"; // Default fallback
            System.out.println("⚠️  No model specified, using default: " + model);
        }

        if (conversationId == null || conversationId.isEmpty()) {
            conversationId = java.util.UUID.randomUUID().toString();
            System.out.println("🆕 Generated new conversation ID: " + conversationId);
        }

        if (userId == null || userId.isEmpty()) {
            System.out.println("❌ ERROR: User ID is required");
            System.out.println("========== END CHAT REQUEST (ERROR) ==========");
            return Map.of("error", "User ID is required", "conversationId", conversationId);
        }

        System.out.println("🔄 Processing message with Ollama...");
        String aiResponse = ollamaService.chat(model, userMessage);
        System.out.println("✅ AI Response Generated");
        System.out.println("🔤 Response: " + aiResponse);

        ChatHistory chatHistory = new ChatHistory(userId, conversationId, userMessage, aiResponse);

        try {
            System.out.println("💾 Saving to MongoDB...");
            chatHistoryRepository.save(chatHistory);
            System.out.println("✅ ChatHistory saved successfully!");
            System.out.println("   - User ID: " + userId);
            System.out.println("   - Conversation ID: " + conversationId);
            System.out.println("   - Message Length: " + userMessage.length() + " chars");
            System.out.println("   - Response Length: " + aiResponse.length() + " chars");
        } catch (Exception e) {
            System.err.println("❌ ERROR: Failed to save ChatHistory to MongoDB: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("========== END CHAT REQUEST ==========\n");

        Map<String, String> response = new java.util.HashMap<>();
        response.put("response", aiResponse);
        response.put("conversationId", conversationId);
        return response;
    }

    @GetMapping
    public List<ChatHistory> getChatHistory(@RequestParam String userId) {
        System.out.println("\n========== FETCH CHAT HISTORY REQUEST ==========");
        System.out.println("👤 User ID: " + userId);
        
        if (userId == null || userId.isEmpty()) {
            System.out.println("❌ ERROR: User ID is required");
            System.out.println("========== END FETCH REQUEST (ERROR) ==========");
            return new java.util.ArrayList<>();
        }
        
        System.out.println("🔍 Searching chat history for user...");
        List<ChatHistory> history = chatHistoryRepository.findByUserId(userId);
        System.out.println("✅ Found " + history.size() + " chat(s) for this user");
        history.forEach(chat -> System.out.println("   - Conversation: " + chat.getConversationId() + " (" + chat.getUserMessage().length() + " chars)"));
        System.out.println("========== END FETCH REQUEST ==========\n");
        
        return history;
    }
}
