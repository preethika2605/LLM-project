package com.localai.controller;

import com.localai.model.User;
import com.localai.repository.UserRepository;
import com.localai.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
}, allowCredentials = "true")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            if (user.getUsername() == null || user.getUsername().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }

            if (user.getPassword() == null || user.getPassword().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }

            User existingUser = userRepository.findByUsername(user.getUsername());
            if (existingUser != null) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "User already exists"));
            }

            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = userRepository.save(user);
            String token = jwtUtil.generateToken(savedUser.getId(), savedUser.getUsername());

            return ResponseEntity.ok(buildAuthResponse(savedUser, token, "Registration successful"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        try {
            if (loginRequest.getUsername() == null || loginRequest.getUsername().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }

            if (loginRequest.getPassword() == null || loginRequest.getPassword().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }

            User user = userRepository.findByUsername(loginRequest.getUsername());
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid credentials"));
            }

            boolean passwordMatches = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());

            // Backward compatibility for old plain-text records.
            if (!passwordMatches && user.getPassword().equals(loginRequest.getPassword())) {
                user.setPassword(passwordEncoder.encode(loginRequest.getPassword()));
                userRepository.save(user);
                passwordMatches = true;
            }

            if (!passwordMatches) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid credentials"));
            }

            String token = jwtUtil.generateToken(user.getId(), user.getUsername());
            return ResponseEntity.ok(buildAuthResponse(user, token, "Login successful"));
        } catch (Exception e) {
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
            List<User> users = userRepository.findAll();
            return ResponseEntity.ok(Map.of(
                    "totalUsers", users.size(),
                    "users", users
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch users: " + e.getMessage()));
        }
    }

    private Map<String, Object> buildAuthResponse(User user, String token, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("token", token);
        response.put("message", message);
        return response;
    }
}
