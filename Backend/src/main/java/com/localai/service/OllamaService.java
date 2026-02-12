package com.localai.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OllamaService {

    private final String OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
    private final String OLLAMA_TAGS_URL = "http://127.0.0.1:11434/api/tags";

    // Available models
    private final List<String> AVAILABLE_MODELS = Arrays.asList(
        "granite3.2:2b",
        "llama3.2:1b",
        "deepseek-coder:latest",
        "qwen2.5:1.5b"
    );

    public String chat(String model, String prompt) {
        RestTemplate restTemplate = new RestTemplate();

        // Validate model
        if (model == null || model.isEmpty()) {
            model = "qwen2.5:1.5b"; // Default fallback
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", "You are a helpful AI assistant. Provide clear, accurate, and concise responses.");
        body.put("prompt", prompt);
        body.put("stream", false);

        try {
            Map response = restTemplate.postForObject(OLLAMA_URL, body, Map.class);
            String aiResponse = response.get("response").toString();
            System.out.println("AI Response: " + aiResponse);
            return aiResponse;
        } catch (Exception e) {
            e.printStackTrace();
            return "Error communicating with Ollama: " + e.getMessage();
        }
    }

    public List<String> getAvailableModels() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            Map response = restTemplate.getForObject(OLLAMA_TAGS_URL, Map.class);
            List<Map<String, Object>> models = (List<Map<String, Object>>) response.get("models");
            return models.stream().map(model -> (String) model.get("name")).toList();
        } catch (Exception e) {
            System.out.println("Failed to fetch models from Ollama, using default list: " + e.getMessage());
            return AVAILABLE_MODELS;
        }
    }

    public Map<String, Object> getModelInfo(String model) {
        Map<String, Object> modelInfo = new HashMap<>();
        
        switch (model) {
            case "granite3.2:2b":
                modelInfo.put("name", "Granite 3.2 (2B)");
                modelInfo.put("description", "IBM's Granite model - efficient and performant");
                modelInfo.put("size", "1.5 GB");
                modelInfo.put("parameters", "2 billion");
                break;
            case "llama3.2:1b":
                modelInfo.put("name", "Llama 3.2 (1B)");
                modelInfo.put("description", "Meta's Llama model - lightweight and fast");
                modelInfo.put("size", "1.3 GB");
                modelInfo.put("parameters", "1 billion");
                break;
            case "deepseek-coder:latest":
                modelInfo.put("name", "DeepSeek Coder");
                modelInfo.put("description", "Specialized for code generation and understanding");
                modelInfo.put("size", "776 MB");
                modelInfo.put("parameters", "Variable");
                break;
            case "qwen2.5:1.5b":
                modelInfo.put("name", "Qwen 2.5 (1.5B)");
                modelInfo.put("description", "Alibaba's Qwen - balanced performance");
                modelInfo.put("size", "986 MB");
                modelInfo.put("parameters", "1.5 billion");
                break;
            default:
                modelInfo.put("name", model);
                modelInfo.put("description", "Custom model");
        }
        
        return modelInfo;
    }
}