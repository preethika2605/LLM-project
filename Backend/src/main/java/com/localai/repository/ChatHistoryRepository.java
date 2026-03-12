package com.localai.repository;

import com.localai.model.ChatHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatHistoryRepository extends MongoRepository<ChatHistory, String> {
    List<ChatHistory> findByUserId(String userId);
    List<ChatHistory> findByConversationIdOrderByTimestampAsc(String conversationId);
}
