package com.localai.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class OllamaService {

    private final String OLLAMA_URL = "http://localhost:11434/api/generate";

    public String chat(String model, String prompt) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", "You are a helpful AI assistant. Provide clear, accurate, and concise responses.");
        body.put("prompt", prompt);
        body.put("stream", false);

        Map response = restTemplate.postForObject(OLLAMA_URL, body, Map.class);
        return response.get("response").toString();
    }
}