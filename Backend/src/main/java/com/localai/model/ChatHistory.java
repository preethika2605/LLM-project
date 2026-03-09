package com.localai.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "chat_history")
public class ChatHistory {

    @Id
    private String id;

    private String userId;
    private String conversationId;
    private String userMessage;
    private String aiResponse;
    private String imageData;
    private String fileData;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String keyword;
    private LocalDateTime timestamp;

    public ChatHistory() {
        this.timestamp = LocalDateTime.now();
    }

    public ChatHistory(String userId, String conversationId, String userMessage, String aiResponse) {
        this(userId, conversationId, userMessage, aiResponse, null, null, null, null, null, null);
    }

    public ChatHistory(String userId, String conversationId, String userMessage, String aiResponse, LocalDateTime timestamp) {
        this(userId, conversationId, userMessage, aiResponse, null, null, null, null, null, null);
        this.timestamp = timestamp;
    }

    public ChatHistory(String userId, String conversationId, String userMessage, String aiResponse, String imageData) {
        this(userId, conversationId, userMessage, aiResponse, imageData, null, null, null, null, null);
    }

    public ChatHistory(String userId, String conversationId, String userMessage, String aiResponse, String imageData, String keyword) {
        this(userId, conversationId, userMessage, aiResponse, imageData, null, null, null, null, keyword);
    }

    public ChatHistory(
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
        this.userId = userId;
        this.conversationId = conversationId;
        this.userMessage = userMessage;
        this.aiResponse = aiResponse;
        this.imageData = imageData;
        this.fileData = fileData;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.keyword = keyword;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public String getAiResponse() {
        return aiResponse;
    }

    public String getImageData() {
        return imageData;
    }

    public String getKeyword() {
        return keyword;
    }

    public String getFileData() {
        return fileData;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public Long getFileSize() {
        return fileSize;
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

    public void setImageData(String imageData) {
        this.imageData = imageData;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public void setFileData(String fileData) {
        this.fileData = fileData;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
