package com.localai.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final com.localai.repository.UserRepository userRepository;

    public AuthController(com.localai.repository.UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public com.localai.model.User register(@RequestBody com.localai.model.User user) {
        if (userRepository.findByUsername(user.getUsername()) != null) {
            throw new RuntimeException("User already exists");
        }
        return userRepository.save(user);
    }

    @PostMapping("/login")
    public com.localai.model.User login(@RequestBody com.localai.model.User loginRequest) {
        com.localai.model.User user = userRepository.findByUsername(loginRequest.getUsername());
        if (user != null && user.getPassword().equals(loginRequest.getPassword())) {
            return user;
        }
        throw new RuntimeException("Invalid credentials");
    }

    @GetMapping("/test")
    public String test() {
        return "Backend is working!";
    }
}
