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
            System.out.println("\n========== REGISTRATION REQUEST ==========");
            System.out.println("📝 Incoming User Data: " + user);
            System.out.println("Username: " + user.getUsername());
            System.out.println("Email: " + user.getEmail());
            System.out.println("Password: " + (user.getPassword() != null ? "***" : "null"));
            
            if (user.getUsername() == null || user.getUsername().isEmpty()) {
                System.out.println("❌ Error: Username is required");
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            
            if (user.getPassword() == null || user.getPassword().isEmpty()) {
                System.out.println("❌ Error: Password is required");
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            
            System.out.println("🔍 Checking if user already exists...");
            com.localai.model.User existingUser = userRepository.findByUsername(user.getUsername());
            if (existingUser != null) {
                System.out.println("❌ Error: User already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "User already exists"));
            }
            System.out.println("✓ User doesn't exist, proceeding with save");
            
            System.out.println("💾 Saving user to MongoDB...");
            com.localai.model.User savedUser = userRepository.save(user);
            System.out.println("✅ User saved successfully!");
            System.out.println("Saved User Data: " + savedUser);
            System.out.println("Generated ID: " + savedUser.getId());
            System.out.println("========== END REGISTRATION ==========");
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            System.err.println("❌ REGISTRATION ERROR: " + e.getMessage());
            e.printStackTrace();
            System.out.println("========== END REGISTRATION (ERROR) ==========");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody com.localai.model.User loginRequest) {
        try {
            System.out.println("\n========== LOGIN REQUEST ==========");
            System.out.println("👤 Login Attempt for: " + loginRequest.getUsername());
            
            if (loginRequest.getUsername() == null || loginRequest.getUsername().isEmpty()) {
                System.out.println("❌ Error: Username is required");
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            
            if (loginRequest.getPassword() == null || loginRequest.getPassword().isEmpty()) {
                System.out.println("❌ Error: Password is required");
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            
            System.out.println("🔍 Searching for user in database...");
            com.localai.model.User user = userRepository.findByUsername(loginRequest.getUsername());
            
            if (user != null) {
                System.out.println("✓ User found: " + user);
                System.out.println("🔐 Verifying password...");
                if (user.getPassword().equals(loginRequest.getPassword())) {
                    System.out.println("✅ Login successful! ");
                    System.out.println("User Details: " + user);
                    System.out.println("========== END LOGIN (SUCCESS) ==========");
                    return ResponseEntity.ok(user);
                } else {
                    System.out.println("❌ Password mismatch");
                }
            } else {
                System.out.println("❌ User not found in database");
            }
            
            System.out.println("❌ Invalid credentials");
            System.out.println("========== END LOGIN (FAILED) ==========");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            System.err.println("❌ LOGIN ERROR: " + e.getMessage());
            e.printStackTrace();
            System.out.println("========== END LOGIN (ERROR) ==========");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/test")
    public String test() {
        return "Backend is working!";
    }

    @GetMapping("/debug/users")
    public ResponseEntity<?> debugGetAllUsers() {
        try {
            System.out.println("\n========== DEBUG: GET ALL USERS ==========");
            java.util.List<com.localai.model.User> allUsers = userRepository.findAll();
            System.out.println("Total users in database: " + allUsers.size());
            allUsers.forEach(user -> System.out.println("  - " + user));
            System.out.println("========== END DEBUG ==========");
            return ResponseEntity.ok(Map.of(
                "totalUsers", allUsers.size(),
                "users", allUsers
            ));
        } catch (Exception e) {
            System.err.println("❌ DEBUG ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch users: " + e.getMessage()));
        }
    }
}
