# TODO: CRT Responses + PPT/PDF Upload Implementation

## Phase 1: Backend Dependencies
- [ ] Add Apache PDFBox dependency to pom.xml
- [ ] Add Apache POI dependencies to pom.xml

## Phase 2: Backend - OllamaService.java
- [ ] Add CRT-focused system prompts (concise, direct responses)
- [ ] Add PPT text extraction method using Apache POI
- [ ] Add PDF text extraction method using Apache PDFBox
- [ ] Add file content processing method

## Phase 3: Backend - ChatController.java
- [ ] Add file upload endpoint (/api/chat/upload)
- [ ] Handle PPT, PDF file uploads
- [ ] Process extracted text with chat messages

## Phase 4: Frontend - MessageInput.jsx
- [ ] Add PPT file upload button
- [ ] Add PDF file upload button
- [ ] Add file preview for PPT/PDF
- [ ] Handle file selection and removal

## Phase 5: Frontend - api.js
- [ ] Add file upload API function

## Phase 6: Testing
- [ ] Test PPT upload and text extraction
- [ ] Test PDF upload and text extraction
- [ ] Test CRT response style

