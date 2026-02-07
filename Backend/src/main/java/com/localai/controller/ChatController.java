package com.localai.controller;

import com.localai.service.OllamaService;
import com.localai.model.ChatHistory;
import com.localai.repository.ChatHistoryRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
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

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> request) {

        String userMessage = request.get("message");
        String model = request.get("model");

        if (model == null || model.isEmpty()) {
            model = "qwen"; // Default fallback
        }

        String aiResponse = ollamaService.chat(model, userMessage);

        ChatHistory chatHistory = new ChatHistory(userMessage, aiResponse);

        chatHistoryRepository.save(chatHistory);

        return Map.of("response", aiResponse);
    }

    @GetMapping
    public List<ChatHistory> getChatHistory() {
        return chatHistoryRepository.findAll();
    }
}
