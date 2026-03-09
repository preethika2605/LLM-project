# Performance Optimization TODO

## TODO List:
- [x] 1. Enable @EnableAsync in BackendApplication.java
- [x] 2. Add @Async to ChatController for non-blocking database saves
- [x] 3. Add webflux dependency for future streaming support

## What was implemented:

### 1. Async Database Saving (Done)
- Added `@EnableAsync` to BackendApplication.java
- Modified ChatController.java to save chat history asynchronously using `@Async`
- The AI response is now sent immediately to the client without waiting for database save

### 2. WebFlux Dependency Added
- Added `spring-boot-starter-webflux` to pom.xml for future streaming support

## How this improves speed:
**Before**: User sends message → Backend waits for AI → Backend saves to DB → Backend sends response  
**After**: User sends message → Backend waits for AI → Backend sends response immediately → DB saves in background

The response time is now faster because the database save happens asynchronously in the background after the response is sent.

## Future Enhancement:
For even faster responses (streaming), you can add:
- Streaming endpoint in OllamaService using WebClient
- Frontend changes to handle Server-Sent Events (SSE)

