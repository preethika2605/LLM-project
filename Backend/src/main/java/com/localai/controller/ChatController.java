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

        String userMessage = request.get("message");
        String model = request.get("model");
        String conversationId = request.get("conversationId");

        if (model == null || model.isEmpty()) {
            model = "qwen2.5:1.5b"; // Default fallback
        }

        if (conversationId == null || conversationId.isEmpty()) {
            conversationId = java.util.UUID.randomUUID().toString();
        }

        String aiResponse = ollamaService.chat(model, userMessage);

        ChatHistory chatHistory = new ChatHistory(conversationId, userMessage, aiResponse);

        chatHistoryRepository.save(chatHistory);

        Map<String, String> response = new java.util.HashMap<>();
        response.put("response", aiResponse);
        response.put("conversationId", conversationId);
        return response;
    }

    @GetMapping
    public List<ChatHistory> getChatHistory() {
        return chatHistoryRepository.findAll();
    }
}
