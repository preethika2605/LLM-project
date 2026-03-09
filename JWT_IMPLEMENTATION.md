# JWT Authentication Implementation

## Overview
JWT (JSON Web Token) authentication has been successfully implemented in your Local LLM Chat Application. This ensures secure, stateless authentication with token-based session management.

## Changes Made

### Backend Changes

#### 1. **Added JWT Dependencies** (pom.xml)
- `io.jsonwebtoken:jjwt-api:0.12.3`
- `io.jsonwebtoken:jjwt-impl:0.12.3`
- `io.jsonwebtoken:jjwt-jackson:0.12.3`

#### 2. **Created JWT Security Module** 
- **JwtUtil.java** - Core JWT token utility class
  - `generateToken(userId, username)` - Creates JWT tokens
  - `getUserIdFromToken(token)` - Extracts userId from token
  - `getUsernameFromToken(token)` - Extracts username from token
  - `validateToken(token)` - Validates token signature and expiration
  - `isTokenExpired(token)` - Checks if token is expired

- **JwtAuthenticationFilter.java** - Spring filter for JWT validation
  - Intercepts all requests to `/api/chat` endpoints
  - Validates Bearer token in Authorization header
  - Returns 401 Unauthorized if token is missing or invalid
  - Skips validation for auth endpoints (`/api/auth/register`, `/api/auth/login`)

#### 3. **Updated Configuration**
- **SecurityConfig.java** - Registers JWT filter with Spring Boot
- **WebConfig.java** - Web configuration class

#### 4. **Updated application.properties**
```properties
jwt.secret=MyVeryLongSecretKeyForJWTTokenGenerationAndValidation12345
jwt.expiration=86400000  # 24 hours in milliseconds
```

#### 5. **Updated AuthController**
- `/api/auth/register` - Now returns JWT token on successful registration
- `/api/auth/login` - Now returns JWT token on successful login
- Response includes: `{ id, username, email, token, message }`

### Frontend Changes

#### 1. **Updated api.js Service**
Added JWT token management functions:
- `saveToken(token)` - Saves JWT to localStorage
- `getToken()` - Retrieves JWT from localStorage
- `removeToken()` - Clears JWT from localStorage
- `saveUserData(userData)` - Saves user info
- `getUserData()` - Retrieves user info
- `isTokenExpired()` - Checks if token is expired

Updated API functions to include JWT:
- `registerUser()` - Saves token after registration
- `loginUser()` - Saves token after login
- `logoutUser()` - Clears token and user data
- `getChatHistory()` - Includes Authorization header with JWT
- `sendMessageToBackend()` - Includes Authorization header with JWT
- `getAvailableModels()` - Includes Authorization header with JWT
- `getModelInfo()` - Includes Authorization header with JWT

#### 2. **Updated App.jsx**
- Now reads JWT token and user data from secure storage
- Uses `removeToken()` for logout (clears both token and user data)
- Validates token on app initialization

#### 3. **Updated Login.jsx**
- Token is automatically saved after login/register
- No manual localStorage writes needed

## How It Works

### Registration Flow
```
User enters credentials
     ↓
registerUser() sends to /api/auth/register
     ↓
Backend validates & saves user to MongoDB
     ↓
Backend generates JWT token
     ↓
Backend returns token + user data
     ↓
Frontend saves token to localStorage (saveToken)
     ↓
Frontend saves user data to localStorage
     ↓
Frontend redirects to ChatPage
```

### Login Flow
```
User enters credentials
     ↓
loginUser() sends to /api/auth/login
     ↓
Backend validates credentials
     ↓
Backend generates JWT token
     ↓
Backend returns token + user data
     ↓
Frontend saves token to localStorage
     ↓
Frontend saves user data to localStorage
     ↓
Frontend redirects to ChatPage
```

### Chat Request Flow
```
User sends message from ChatPage
     ↓
sendMessageToBackend() retrieves JWT from localStorage
     ↓
sendMessageToBackend() adds Bearer token to Authorization header
     ↓
Request sent: Authorization: Bearer <jwt_token>
     ↓
Backend JwtAuthenticationFilter validates token
     ↓
If valid: ChatController processes request
If invalid/expired: Returns 401 Unauthorized
     ↓
Frontend detects 401 → Auto-logout → Redirect to login
```

## Token Features

### Token Structure
JWT tokens have three parts: **Header.Payload.Signature**

**Header**: Algorithm (HS512) and type (JWT)
**Payload**: Includes:
- `sub` (subject) - User ID
- `username` - Username
- `iat` (issued at) - Creation timestamp
- `exp` (expiration) - Expiration timestamp

**Signature**: HMAC-SHA512 encoded with secret key

### Token Expiration
- **Default**: 86400000 milliseconds = 24 hours
- Frontend checks expiration before each API call
- Expired tokens trigger automatic logout with message: "Session expired. Please login again."

### Security Features
- ✅ Token validation on all protected endpoints
- ✅ Automatic logout on token expiration
- ✅ Bearer token in Authorization header
- ✅ HMAC-SHA512 signature verification
- ✅ User isolation (each user has unique token)

## Testing JWT Implementation

### Step 1: Register a New User
1. Open frontend in browser
2. Click "Create Account"
3. Enter username, email, password
4. Click "Register"
5. Check browser Console (F12 → Console):
   - Should see: "✅ JWT token saved to localStorage"
   - Should see: "💾 Saving JWT token to localStorage"

### Step 2: Verify Token in Storage
1. Open Developer Tools (F12)
2. Go to "Application" tab
3. Click "Local Storage" → "http://localhost:5173"
4. Look for `jwt_token` - Should contain the JWT
5. Look for `user_data` - Should contain user info

### Step 3: Send a Chat Message
1. Select a model from dropdown
2. Type a message in the chat input
3. Open Network tab (F12 → Network)
4. Send message
5. Click on `/api/chat` POST request
6. Go to "Request Headers"
7. Look for header: `Authorization: Bearer <jwt_token>`

### Step 4: Check Backend Logs
Backend console should show:
```
🔐 Generating JWT token for user: <username>
✅ JWT token generated successfully
   Expires in: 86400 seconds

🔐 Adding JWT token to request header
✅ JWT token validated for request to: /api/chat
```

### Step 5: Test Token Expiration
1. Modify `jwt.expiration` in application.properties to small value (e.g., 10000 = 10 seconds)
2. Restart backend
3. Register new user
4. Wait 10 seconds
5. Send chat message
6. Should see: "⚠️ JWT token expired, please login again"
7. Frontend auto-redirects to login

## Error Handling

### 401 Unauthorized
**Causes**:
- Missing Authorization header
- Invalid token signature
- Expired token
- Malformed token

**Frontend Response**:
- Displays error: "Session expired. Please login again."
- Auto-clears token and user data
- Redirects to login page

### Missing Token
**Response**: 
```json
{
  "error": "JWT token is missing"
}
```

### Invalid Token
**Response**:
```json
{
  "error": "JWT token is invalid or expired"
}
```

## Configuration

### Change JWT Expiration Time
Edit `application.properties`:
```properties
jwt.expiration=3600000  # 1 hour
jwt.expiration=604800000  # 7 days
jwt.expiration=2592000000  # 30 days
```

### Change JWT Secret Key
Edit `application.properties`:
```properties
jwt.secret=YourVeryLongSecretKeyHere123456789
```

**Note**: Change the secret key before deploying to production!

## Security Best Practices

✅ **Implemented**:
- Token stored in localStorage (accessible only to same domain)
- Secure token validation on backend
- Bearer token in Authorization header
- Automatic logout on expiration

⚠️ **For Production**:
- Use HTTPS only (not HTTP)
- Use httpOnly cookies instead of localStorage
- Increase JWT expiration prudently
- Implement refresh token mechanism
- Add rate limiting to auth endpoints
- Hash passwords (currently stored in plain text)

## Files Modified/Created

**Created**:
- `Backend/src/main/java/com/localai/security/JwtUtil.java`
- `Backend/src/main/java/com/localai/security/JwtAuthenticationFilter.java`
- `Backend/src/main/java/com/localai/config/SecurityConfig.java`
- `Backend/src/main/java/com/localai/config/WebConfig.java`

**Modified**:
- `Backend/pom.xml` - Added JWT dependencies
- `Backend/src/main/resources/application.properties` - Added JWT config
- `Backend/src/main/java/com/localai/controller/AuthController.java` - Added token generation
- `Frontend/src/services/api.js` - Added token management
- `Frontend/src/App.jsx` - Updated to use JWT functions
- `Frontend/src/pages/Login.jsx` - No changes needed (automatic via api.js)

## Troubleshooting

### Token not saving to localStorage
- Check browser console for errors
- Verify localStorage is not disabled
- Check if CORS is properly configured

### 401 errors on chat requests
- Verify token exists in localStorage
- Check token expiration time
- Restart backend to ensure JwtUtil is loaded

### Backend not recognizing token
- Ensure JwtAuthenticationFilter is registered in SecurityConfig
- Check JWT secret key matches in application.properties
- Verify Bearer token format in Authorization header

### Token validation failing
- Check JWT format: `Authorization: Bearer <token>`
- Verify token hasn't been modified
- Check JWT expiration time in application.properties
