package com.localai.repository;

import com.localai.model.ChatHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatHistoryRepository extends MongoRepository<ChatHistory, String> {
}