package com.localai.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:3000"}, allowCredentials = "true")
public class AuthController {

    private final com.localai.repository.UserRepository userRepository;

    public AuthController(com.localai.repository.UserRepository userRepository) {
        this.userRepository = userRepository;
        System.out.println("AuthController initialized!");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody com.localai.model.User user) {
        try {
            System.out.println("Registering user: " + user.getUsername());
            
            if (user.getUsername() == null || user.getUsername().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            
            if (user.getPassword() == null || user.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            
            if (userRepository.findByUsername(user.getUsername()) != null) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "User already exists"));
            }
            
            com.localai.model.User savedUser = userRepository.save(user);
            System.out.println("User registered successfully: " + savedUser.getUsername());
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            System.err.println("Registration error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody com.localai.model.User loginRequest) {
        try {
            System.out.println("Login attempt for user: " + loginRequest.getUsername());
            
            if (loginRequest.getUsername() == null || loginRequest.getUsername().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            
            if (loginRequest.getPassword() == null || loginRequest.getPassword().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            
            com.localai.model.User user = userRepository.findByUsername(loginRequest.getUsername());
            if (user != null && user.getPassword().equals(loginRequest.getPassword())) {
                System.out.println("Login successful for user: " + user.getUsername());
                return ResponseEntity.ok(user);
            }
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/test")
    public String test() {
        return "Backend is working!";
    }
}
