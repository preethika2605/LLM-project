package com.localai.backend.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.localai.backend.model.User;

public interface UserRepository extends MongoRepository<User, String> {
    User findByUsername(String username);
}