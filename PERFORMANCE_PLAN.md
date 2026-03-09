# Performance Optimization Plan

## Information Gathered:
- Current architecture: Frontend → Backend → Ollama (synchronous, waits for full response)
- Backend uses Spring Boot with RestTemplate
- Frontend uses React with fetch API
- Ollama runs locally on port 11434

## Plan:

### 1. Backend Changes (OllamaService.java)
- **Add streaming support**: Change from `stream: false` to `stream: true`
- **Reuse RestTemplate**: Use @Autowired RestTemplate instead of creating new ones
- **Add async database saving**: Use @Async for saving chat history

### 2. Backend Changes (ChatController.java)
- **Add streaming endpoint**: Create new endpoint `/api/chat/stream` that returns Server-Sent Events (SSE)
- **Keep backward compatibility**: Keep existing endpoint for non-streaming

### 3. Frontend Changes (ChatPage.jsx)
- **Handle streaming response**: Use EventSource or fetch with ReadableStream
- **Display incremental responses**: Show AI response as it arrives (no "Thinking..." delay)

### 4. Frontend Changes (api.js)
- **Add streaming message function**: New function `sendMessageToBackendStream`

### 5. Optional: Use Faster Model
- Consider using `qwen2.5:0.5b` or `llama3.2:1b` for faster responses

## Dependent Files to be edited:
1. Backend/src/main/java/com/localai/service/OllamaService.java
2. Backend/src/main/java/com/localai/controller/ChatController.java
3. Backend/src/main/java/com/localai/BackendApplication.java (add @EnableAsync)
4. Frontend/src/services/api.js
5. Frontend/src/pages/ChatPage.jsx

## Followup steps:
1. Test streaming functionality works correctly
2. Verify database saves still work
3. Test with different models for speed comparison

