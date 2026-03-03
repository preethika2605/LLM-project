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

        // Generate appropriate system prompt based on user request
        String systemPrompt = generateSystemPrompt(model, prompt);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", systemPrompt);
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

    private String generateSystemPrompt(String model, String prompt) {
        String lowerPrompt = prompt.toLowerCase();

        // Check if request is for code without comments
        if ((lowerPrompt.contains("code") || lowerPrompt.contains("write") || lowerPrompt.contains("script")) &&
            (lowerPrompt.contains("without comment") || lowerPrompt.contains("no comment") || 
             lowerPrompt.contains("without explanation") || lowerPrompt.contains("no explanation"))) {
            return "You are an expert programmer. Generate ONLY the code requested. " +
                   "DO NOT include any comments, explanations, or markdown formatting. " +
                   "Return ONLY the raw code with NO comments whatsoever. " +
                   "Strip all // comments, /* */ comments, and # comments from the output.";
        }

        // Check if request is for output/examples/results
        if (lowerPrompt.contains("output") || lowerPrompt.contains("sample output") || 
            lowerPrompt.contains("example") || lowerPrompt.contains("result") ||
            lowerPrompt.contains("show me") || lowerPrompt.contains("demonstration")) {
            return "You are a helpful assistant. Provide ONLY the requested output or example. " +
                   "Do NOT include code or explanations unless specifically asked. " +
                   "Show clear, concise results or examples that directly answer the question.";
        }

        // Check if request is for code (general)
        if (lowerPrompt.contains("code") || lowerPrompt.contains("script") || lowerPrompt.contains("function") ||
            lowerPrompt.contains("class") || lowerPrompt.contains("algorithm")) {
            return "You are an expert programmer. Provide well-commented, clean code. " +
                   "Include helpful comments explaining the logic. Use best practices and follow the language conventions.";
        }

        // Check if request is for explanations or tutorials
        if (lowerPrompt.contains("explain") || lowerPrompt.contains("how to") || lowerPrompt.contains("tutorial")) {
            return "You are a helpful educator. Explain concepts clearly and concisely with examples. " +
                   "Break down complex ideas into simple steps.";
        }

        // Default system prompt
        return "You are a helpful AI assistant. Provide clear, accurate, and concise responses.";
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