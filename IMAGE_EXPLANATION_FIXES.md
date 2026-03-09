# Image Explanation - Fixes Applied & Troubleshooting Guide

## ✅ Fixes Applied

### 1. **Backend Configuration** (`application.properties`)
- Added max upload size: 10MB
- Added JWT configuration that was missing
- Configured multipart upload support

```properties
server.tomcat.max-http-post-size=10485760
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

### 2. **Backend Response Format** (`ChatController.java`)
- Updated return type from `Map<String, String>` to `Map<String, Object>`
- Added `status` and `timestamp` fields to response
- Improved error response format
- Added image data validation logging

### 3. **Frontend Error Handling** (`ChatPage.jsx`)
- Added check for `data.error` field
- Added logging for image processing responses
- Better error messages when backend fails

### 4. **Frontend Image Validation** (`MessageInput.jsx`)
- Added 5MB file size limit check
- Added logging for image load events
- Error handling for file read failures

---

## 🔍 Troubleshooting Steps

### Step 1: Check Backend Logs
When you send an image, you should see output like:
```
========== INCOMING CHAT REQUEST ==========
🖼️  Image Data Present: true
📝 Image data validation:
   - Size: [NUMBER] characters
   - Format: Data URL
📤 Sending image to Ollama with model: [MODEL_NAME]
✅ Image analysis complete
```

**If you DON'T see this:** Image isn't reaching the backend
- Check browser Network tab for CORS errors
- Check JWT token is valid
- Verify image size < 10MB

### Step 2: Check Ollama Vision Model
Run in terminal:
```bash
ollama list
```

You should see a vision model like:
- `llava`
- `bakllava`
- `minicpm-v`
- `llava-phi`

**If you DON'T see one:** Install a vision model
```bash
ollama pull llava
```

### Step 3: Check Browser Console
Open DevTools (F12) → Console tab

**Expected logs for image:**
```
Image loaded for analysis: {
  fileName: "example.jpg",
  fileSize: 245123,
  fileType: "image/jpeg",
  base64Length: 327123
}

Image processing response: {
  status: "success",
  responseLength: 1234,
  timestamp: "2026-03-06T..."
}
```

**If you see errors:** Look for messages like:
- `Backend error: [MESSAGE]` → Backend rejected request
- `Error: No response from backend` → Connection issue
- Network error → CORS or JWT issue

### Step 4: Restart Services

**Backend:**
```bash
cd Backend
mvn clean spring-boot:run
```

**Frontend:**
```bash
cd Frontend
npm run dev
```

**Ollama:**
```bash
ollama serve
```

---

## 🧪 Test Image Explanation

1. **Go to Chat**: Login and open a new chat
2. **Click Image Button**: Click the 📎 emoji button
3. **Select Image**: Choose a test image (JPG/PNG)
4. **Send**: Click the ➤ button or press Enter
5. **Monitor**:
   - Check backend console for image processing logs
   - Check browser console for response logs
   - Wait for AI to analyze the image

---

## ❌ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Image too large! Please select an image < 5MB` | Frontend validation | Select smaller image |
| Backend: `Model 'xxx' does not support images` | Non-vision model used | Ensure vision model is selected |
| No vision models available | No vision models installed | Run: `ollama pull llava` |
| `413 Payload Too Large` | Image exceeds 10MB limit | Select smaller image |
| `401 Unauthorized` | JWT token expired | Re-login |
| `CORS error` | Frontend-backend mismatch | Check ports match in config |
| Empty response from AI | Vision model error | Check Ollama logs |

---

## 🔧 Additional Debugging

### Enable More Verbose Logging
Add to `application.properties`:
```properties
logging.level.com.localai=DEBUG
logging.level.org.springframework.web=DEBUG
```

### Check Ollama Connection
```bash
curl http://127.0.0.1:11434/api/tags
```

Should return available models.

### Test Backend Directly
```bash
curl -X POST http://localhost:8080/api/chat/test
```

Should return: `ChatController is working!`

---

## 📝 Notes

- Maximum image size: 10MB (backend), 5MB (frontend validation)
- Base64 encoding increases file size by ~33%
- Vision model processing may take 10-30 seconds depending on image size
- Only these models support images: llava, bakllava, minicpm-v, llava-phi

