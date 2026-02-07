package com.localai.controller;

import com.localai.backend.service.OllamaService;
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
        this.ollamaService = ollamaService;
        this.chatHistoryRepository = chatHistoryRepository;
    }

    @PostMapping
    public Map<String, String> chat(@RequestBody Map<String, String> request) {

        String userMessage = request.get("message");

        String aiResponse = ollamaService.chat("deepseek-custom", userMessage);

        ChatHistory chatHistory =
                new ChatHistory(userMessage, aiResponse);

        chatHistoryRepository.save(chatHistory);

        return Map.of("response", aiResponse);
    }

    @GetMapping
    public List<ChatHistory> getChatHistory() {
        return chatHistoryRepository.findAll();
    }
}
