package com.localai.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "chat_history")
public class ChatHistory {

    @Id
    private String id;

    private String conversationId;
    private String userMessage;
    private String aiResponse;
    private LocalDateTime timestamp;

    public ChatHistory() {
        this.timestamp = LocalDateTime.now();
    }

    public ChatHistory(String conversationId, String userMessage, String aiResponse) {
        this.conversationId = conversationId;
        this.userMessage = userMessage;
        this.aiResponse = aiResponse;
        this.timestamp = LocalDateTime.now();
    }

    public ChatHistory(String conversationId, String userMessage, String aiResponse, LocalDateTime timestamp) {
        this.conversationId = conversationId;
        this.userMessage = userMessage;
        this.aiResponse = aiResponse;
        this.timestamp = timestamp;
    }

    public String getId() {
        return id;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public String getAiResponse() {
        return aiResponse;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public void setUserMessage(String userMessage) {
        this.userMessage = userMessage;
    }

    public void setAiResponse(String aiResponse) {
        this.aiResponse = aiResponse;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
