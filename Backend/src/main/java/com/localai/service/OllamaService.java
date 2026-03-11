package com.localai.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.MediaType;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import reactor.core.publisher.Flux;

@Service
public class OllamaService {

    private final String OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
    private final String OLLAMA_TAGS_URL = "http://127.0.0.1:11434/api/tags";
    private final WebClient webClient = WebClient.builder().baseUrl("http://127.0.0.1:11434").build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Vision models that support image analysis
    private final List<String> VISION_MODELS = Arrays.asList(
        "llava",
        "bakllava",
        "minicpm-v",
        "llava-phi"
    );

    // Available models
    private final List<String> AVAILABLE_MODELS = Arrays.asList(
        "granite3.2:2b",
        "llama3.2:1b",
        "deepseek-coder:latest",
        "qwen2.5:1.5b"
    );

    /**
     * Main chat method - handles text, image, and file content
     */
    public String chat(String model, String prompt, String imageData) {
        return chat(model, prompt, imageData, null);
    }

    /**
     * Extended chat method with file content support
     */
    public String chat(String model, String prompt, String imageData, String fileContent) {
        RestTemplate restTemplate = new RestTemplate();

        // Validate model
        if (model == null || model.isEmpty()) {
            model = "qwen2.5:1.5b";
        }

        // Build enhanced prompt with file content
        String enhancedPrompt = buildEnhancedPrompt(prompt, fileContent);

        // Check if image data is provided
        if (imageData != null && !imageData.isEmpty()) {
            System.out.println("Image data detected - attempting image processing...");
            return chatWithImage(model, enhancedPrompt, imageData);
        }

        // Generate CRT-focused system prompt for concise responses
        String systemPrompt = generateCRTSystemPrompt(model, prompt, fileContent);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", systemPrompt);
        body.put("prompt", enhancedPrompt);
        body.put("stream", false);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(OLLAMA_URL, body, Map.class);
            if (response != null) {
                Object aiResponseObj = response.get("response");
                String aiResponse = aiResponseObj != null ? aiResponseObj.toString() : "";
                System.out.println("AI Response: " + aiResponse);
                return aiResponse;
            } else {
                return "Error: No response from Ollama";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Error communicating with Ollama: " + e.getMessage();
        }
    }

    /**
     * Stream chat responses from Ollama.
     */
    public Flux<String> chatStream(String model, String prompt, String imageData, String fileContent) {
        if (model == null || model.isEmpty()) {
            model = "qwen2.5:1.5b";
        }

        String enhancedPrompt = buildEnhancedPrompt(prompt, fileContent);
        String systemPrompt = generateCRTSystemPrompt(model, prompt, fileContent);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", systemPrompt);
        body.put("prompt", enhancedPrompt);
        body.put("stream", true);

        if (imageData != null && !imageData.isEmpty()) {
            String visionModel = resolveVisionModel(model);
            if (visionModel == null) {
                return Flux.just("Image Analysis Not Available: No vision models (like 'llava') are installed on your Ollama instance. Please install a vision model and try again.");
            }
            body.put("model", visionModel);

            String base64Image = imageData.contains(",")
                    ? imageData.substring(imageData.indexOf(",") + 1)
                    : imageData;
            body.put("images", Arrays.asList(base64Image));
        }

        return webClient.post()
                .uri("/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(DataBuffer.class)
                .transform(this::toLineFlux)
                .flatMap(this::extractTokenFromJsonLine)
                .onErrorResume(err -> Flux.just("Error communicating with Ollama: " + err.getMessage()));
    }

    /**
     * Build enhanced prompt with file content
     */
    private String buildEnhancedPrompt(String prompt, String fileContent) {
        if (fileContent == null || fileContent.trim().isEmpty()) {
            return prompt;
        }

        String normalizedPrompt = (prompt == null || prompt.trim().isEmpty())
                ? "Explain the uploaded file."
                : prompt.trim();

        boolean hasSlideMarkers = fileContent.contains("Slide 1:");
        String instruction = hasSlideMarkers
                ? "You are given extracted PowerPoint text. If the user asks for explanation, explain slide by slide using slide numbers.\nQuestion: "
                : "You are given extracted document text. Answer using this content as the primary source.\nQuestion: ";

        return instruction + normalizedPrompt + "\n\nExtracted File Content:\n" + fileContent;
    }

    /**
     * Generate an adaptive system prompt based on intent.
     */
    private String generateCRTSystemPrompt(String model, String prompt, String fileContent) {
        String lowerPrompt = (prompt != null ? prompt : "").toLowerCase();
        boolean hasFileContent = fileContent != null && !fileContent.trim().isEmpty();
        boolean wantsReferencePapers = isReferencePaperRequest(lowerPrompt);
        boolean wantsResearchPaper =
                lowerPrompt.contains("research paper") ||
                lowerPrompt.contains("journal") ||
                lowerPrompt.contains("survey paper") ||
                lowerPrompt.contains("literature review") ||
                lowerPrompt.contains("thesis") ||
                ((lowerPrompt.contains("paper") || lowerPrompt.contains("journal article")) &&
                        (lowerPrompt.contains("write") ||
                                lowerPrompt.contains("generate") ||
                                lowerPrompt.contains("create") ||
                                lowerPrompt.contains("draft") ||
                                lowerPrompt.contains("prepare")));
        boolean wantsDocument =
                lowerPrompt.contains("generate document") ||
                lowerPrompt.contains("create document") ||
                lowerPrompt.contains("write document") ||
                lowerPrompt.contains("document for") ||
                lowerPrompt.contains("report") ||
                lowerPrompt.contains("whitepaper") ||
                lowerPrompt.contains("white paper") ||
                lowerPrompt.contains("proposal");
        boolean wantsDetailed =
                lowerPrompt.contains("detailed") ||
                lowerPrompt.contains("in detail") ||
                lowerPrompt.contains("elaborate") ||
                lowerPrompt.contains("comprehensive") ||
                lowerPrompt.contains("step by step") ||
                wantsResearchPaper ||
                wantsDocument;

        if (wantsReferencePapers) {
            int requestedCount = extractRequestedReferenceCount(prompt);
            return "You are an academic research assistant. Provide exactly " + requestedCount +
                    " reference papers relevant to the user's project title. " +
                    "Output in plain text using this exact style (no markdown table):\n" +
                    requestedCount + " Reference Papers for Your Title\n" +
                    "1\n" +
                    "<Authors>\n" +
                    "\"<Paper Title>.\"\n" +
                    "<Venue/Journal/Conference, Year.>\n" +
                    "<1-2 sentence relevance summary>\n" +
                    "<Source: arXiv / IEEE / ACM / Springer / Elsevier / MDPI>\n\n" +
                    "Repeat the same structure for each item up to " + requestedCount + ". " +
                    "Rules: include title and authors for every item, keep numbering consecutive, " +
                    "do not output markdown table, and avoid fabricated claims. " +
                    "If uncertain, mark the entry as Suggested.";
        }

        if (wantsResearchPaper) {
            return "You are an expert academic writer. Generate a detailed, well-structured research paper draft. " +
                    "Include: Title, Abstract, Keywords, Introduction, Problem Statement, Objectives, Methodology, " +
                    "Core Discussion, Results/Findings, Limitations, Future Work, Conclusion, and References section. " +
                    "Use formal tone and substantial detail. If exact citations are unavailable, clearly label them as " +
                    "'Suggested references' and never fabricate verified claims.";
        }

        if (wantsDocument) {
            return "You are a professional technical writer. Generate a complete document tailored to the user's request " +
                    "with clear headings, subsections, and practical detail. Include an executive summary and a final " +
                    "actionable conclusion. Prefer depth over brevity.";
        }

        // Check if this is a file analysis request
        if (hasFileContent) {
            if (wantsDetailed) {
                return "You are a document analysis expert. Provide a detailed answer grounded in the uploaded file content. " +
                        "Use clear sections, include important specifics, and explain step-by-step when useful. " +
                        "If the request asks for slide-by-slide or section-by-section explanation, follow that format exactly.";
            }
            return "You are a document analysis expert. Provide clear and sufficiently detailed answers based on the " +
                    "uploaded content. Use structured formatting and include key evidence from the document.";
        }

        // Check if request is for code without comments
        if ((lowerPrompt.contains("code") || lowerPrompt.contains("write") || lowerPrompt.contains("script")) &&
            (lowerPrompt.contains("without comment") || lowerPrompt.contains("no comment") || 
             lowerPrompt.contains("without explanation") || lowerPrompt.contains("no explanation"))) {
            return "You are an expert programmer. Generate ONLY the code requested. " +
                   "DO NOT include any comments, explanations, or markdown formatting. " +
                   "Return ONLY the raw code with NO comments whatsoever. " +
                   "Preserve exact whitespace and newlines; never merge tokens or remove spaces between keywords.";
        }

        // Check if request is for output/examples/results
        if (lowerPrompt.contains("output") || lowerPrompt.contains("sample output") || 
            lowerPrompt.contains("example") || lowerPrompt.contains("result") ||
            lowerPrompt.contains("show me") || lowerPrompt.contains("demonstration")) {
            return "You are a helpful assistant. Provide ONLY the requested output or example. " +
                   "Do NOT include code or explanations unless specifically asked. " +
                   "Be concise and direct.";
        }

        // Check if request is for code (general)
        if (lowerPrompt.contains("code") || lowerPrompt.contains("script") || lowerPrompt.contains("function") ||
            lowerPrompt.contains("class") || lowerPrompt.contains("algorithm")) {
            return "You are an expert programmer. Provide well-commented, clean code. " +
                   "Include helpful comments explaining the logic. Use best practices. " +
                   "Format code in a fenced code block with the correct language tag when known. " +
                   "Preserve exact whitespace and newlines; never merge tokens or remove spaces between keywords. " +
                   "If the code is in Go, the first line must be exactly: 'package main'.";
        }

        // Check if request is for explanations or tutorials
        if (lowerPrompt.contains("explain") || lowerPrompt.contains("how to") || lowerPrompt.contains("tutorial")) {
            return "You are a helpful educator. Explain concepts clearly with depth. " +
                    "Break complex ideas into logical steps, include examples, and keep the flow structured.";
        }

        // General detailed mode
        if (wantsDetailed) {
            return "You are a helpful AI assistant. Provide detailed, complete, and well-structured responses. " +
                    "Use headings, bullet points, and concrete examples where useful.";
        }

        // Default mode
        return "You are a helpful AI assistant. Provide clear, structured, and reasonably detailed responses. " +
                "Prioritize correctness and practical usefulness.";
    }

    private boolean isReferencePaperRequest(String lowerPrompt) {
        if (lowerPrompt == null || lowerPrompt.isBlank()) {
            return false;
        }

        return lowerPrompt.contains("reference paper") ||
                lowerPrompt.contains("references paper") ||
                lowerPrompt.contains("paper references") ||
                (lowerPrompt.contains("references") &&
                        (lowerPrompt.contains("paper") || lowerPrompt.contains("project"))) ||
                (lowerPrompt.contains("citation") &&
                        (lowerPrompt.contains("paper") || lowerPrompt.contains("project"))) ||
                (lowerPrompt.contains("related work") &&
                        (lowerPrompt.contains("paper") || lowerPrompt.contains("project")));
    }

    private int extractRequestedReferenceCount(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return 10;
        }

        String lowerPrompt = prompt.toLowerCase();
        Pattern beforeKeyword = Pattern.compile("\\b(\\d{1,2})\\s+(reference|references|citation|citations|paper|papers)\\b");
        Pattern afterKeyword = Pattern.compile("\\b(reference|references|citation|citations|paper|papers)\\s+(\\d{1,2})\\b");
        Pattern topPattern = Pattern.compile("\\btop\\s+(\\d{1,2})\\b");
        Pattern fallbackNumber = Pattern.compile("\\b(\\d{1,2})\\b");

        Matcher matcher = beforeKeyword.matcher(lowerPrompt);
        if (matcher.find()) {
            return clampReferenceCount(Integer.parseInt(matcher.group(1)));
        }

        matcher = afterKeyword.matcher(lowerPrompt);
        if (matcher.find()) {
            return clampReferenceCount(Integer.parseInt(matcher.group(2)));
        }

        matcher = topPattern.matcher(lowerPrompt);
        if (matcher.find()) {
            return clampReferenceCount(Integer.parseInt(matcher.group(1)));
        }

        matcher = fallbackNumber.matcher(lowerPrompt);
        if (matcher.find()) {
            return clampReferenceCount(Integer.parseInt(matcher.group(1)));
        }

        return 10;
    }

    private int clampReferenceCount(int count) {
        if (count < 1) {
            return 10;
        }
        return Math.min(count, 25);
    }

    private String chatWithImage(String model, String prompt, String imageData) {
        RestTemplate restTemplate = new RestTemplate();
        
        System.out.println("Image received for analysis");
        System.out.println("Current model: " + model);
        
        // Check if current model supports images
        boolean isVisionModel = VISION_MODELS.stream().anyMatch(model::contains);
        
        if (!isVisionModel) {
            System.out.println("Model '" + model + "' does not support images");
            System.out.println("Available vision models: " + VISION_MODELS);
            
            // Try to find and use an available vision model
            String visionModel = findAvailableVisionModel();
            if (visionModel == null) {
                System.out.println("No vision models available");
                return "Image Analysis Not Available: No vision models (like 'llava') are installed on your Ollama instance. " +
                       "Please install a vision model by running: 'ollama pull llava' and try again.";
            }
            
            System.out.println("Using vision model: " + visionModel);
            model = visionModel;
        }
        
        // Remove data:image/...;base64, prefix if present
        String base64Image = imageData;
        if (imageData.contains(",")) {
            base64Image = imageData.substring(imageData.indexOf(",") + 1);
        }
        
        System.out.println("Base64 Image Size: " + base64Image.length() + " characters");
        
        String userPrompt = prompt != null && !prompt.isEmpty() ? 
            prompt : "Describe this image in detail. What do you see? Explain everything about the image.";

        String visionPrompt = buildDetailedVisionPrompt(userPrompt);
        String visionSystemPrompt = "You are an expert visual analysis assistant. " +
            "Provide DETAILED but CONCISE visual observations. " +
            "Cover: overall scene, key subjects, text/OCR (if visible), colors/lighting, " +
            "actions, and notable details. Keep responses brief and focused.";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("system", visionSystemPrompt);
        body.put("prompt", visionPrompt);
        body.put("images", Arrays.asList(base64Image));
        body.put("stream", false);

        try {
            System.out.println("Sending image to Ollama with model: " + model);
            System.out.println("Prompt: " + visionPrompt);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(OLLAMA_URL, body, Map.class);
            
            if (response != null) {
                Object aiResponseObj = response.get("response");
                String aiResponse = aiResponseObj != null ? aiResponseObj.toString() : "";
                
                if (aiResponse == null || aiResponse.trim().isEmpty()) {
                    System.out.println("Empty response from Ollama");
                    return "The image model did not provide a response. Please try again.";
                }
                
                System.out.println("Image analysis complete");
                System.out.println("Response length: " + aiResponse.length() + " characters");
                return aiResponse;
            } else {
                System.out.println("Null response from Ollama");
                return "Error: No response from Ollama. The vision model may have encountered an issue.";
            }
        } catch (Exception e) {
            System.err.println("Image analysis failed: " + e.getMessage());
            e.printStackTrace();
            return "Error analyzing image: " + e.getMessage() + "\n\nMake sure you have a vision model installed (e.g., 'ollama pull llava')";
        }
    }
    
    private String findAvailableVisionModel() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(OLLAMA_TAGS_URL, Map.class);
            
            if (response != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> models = (List<Map<String, Object>>) response.get("models");
                if (models != null) {
                    for (Map<String, Object> model : models) {
                        String modelName = (String) model.get("name");
                        if (modelName != null) {
                            for (String visionModel : VISION_MODELS) {
                                if (modelName.contains(visionModel)) {
                                    System.out.println("Found vision model: " + modelName);
                                    return modelName;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error checking for vision models: " + e.getMessage());
        }
        return null;
    }

    private String resolveVisionModel(String model) {
        boolean isVisionModel = VISION_MODELS.stream().anyMatch(model::contains);
        if (isVisionModel) {
            return model;
        }
        return findAvailableVisionModel();
    }

    private Flux<String> toLineFlux(Flux<DataBuffer> dataBuffers) {
        return Flux.create(sink -> {
            StringBuilder buffer = new StringBuilder();
            dataBuffers.subscribe(
                    dataBuffer -> {
                        String chunk = StandardCharsets.UTF_8.decode(dataBuffer.asByteBuffer()).toString();
                        DataBufferUtils.release(dataBuffer);
                        buffer.append(chunk);
                        int index;
                        while ((index = buffer.indexOf("\n")) >= 0) {
                            String line = buffer.substring(0, index);
                            buffer.delete(0, index + 1);
                            sink.next(line);
                        }
                    },
                    sink::error,
                    () -> {
                        if (buffer.length() > 0) {
                            sink.next(buffer.toString());
                        }
                        sink.complete();
                    }
            );
        });
    }

    private Flux<String> extractTokenFromJsonLine(String line) {
        if (line == null) {
            return Flux.empty();
        }
        String trimmed = line.trim();
        if (trimmed.isEmpty()) {
            return Flux.empty();
        }
        try {
            JsonNode node = objectMapper.readTree(trimmed);
            JsonNode responseNode = node.get("response");
            if (responseNode != null && !responseNode.isNull()) {
                return Flux.just(responseNode.asText());
            }
        } catch (Exception ignored) {
            // ignore malformed partial lines
        }
        return Flux.empty();
    }

    // Legacy method for backward compatibility
    public String chat(String model, String prompt) {
        return chat(model, prompt, null);
    }

    private String buildDetailedVisionPrompt(String userPrompt) {
        String normalizedPrompt = userPrompt == null ? "" : userPrompt.trim();
        if (normalizedPrompt.isEmpty()) {
            normalizedPrompt = "Describe this image in detail.";
        }

        return normalizedPrompt + "\n\n" +
            "Provide detailed visual analysis with concrete observations. " +
            "Mention fine details that are easy to miss when relevant.";
    }

    /**
     * Extract text from PDF file
     */
    public String extractPdfText(byte[] pdfData) {
        try (PDDocument document = Loader.loadPDF(pdfData)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return cleanExtractedText(text);
        } catch (Exception e) {
            System.err.println("Error extracting PDF text: " + e.getMessage());
            return null;
        }
    }
    /**
     * Extract text from PowerPoint file (PPTX)
     */
    public String extractPptText(byte[] pptData) {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(pptData);
             XMLSlideShow pptx = new XMLSlideShow(bis)) {
            StringBuilder text = new StringBuilder();

            List<XSLFSlide> slides = pptx.getSlides();
            for (int slideIndex = 0; slideIndex < slides.size(); slideIndex++) {
                XSLFSlide slide = slides.get(slideIndex);
                text.append("Slide ").append(slideIndex + 1).append(":\n");

                boolean hasReadableText = false;
                for (int i = 0; i < slide.getShapes().size(); i++) {
                    if (slide.getShapes().get(i) instanceof org.apache.poi.xslf.usermodel.XSLFTextShape) {
                        org.apache.poi.xslf.usermodel.XSLFTextShape textShape =
                                (org.apache.poi.xslf.usermodel.XSLFTextShape) slide.getShapes().get(i);
                        String shapeText = textShape.getText();
                        if (shapeText != null && !shapeText.trim().isEmpty()) {
                            text.append(shapeText.trim()).append("\n");
                            hasReadableText = true;
                        }
                    }
                }

                if (!hasReadableText) {
                    text.append("[No readable text detected on this slide]\n");
                }

                text.append("\n");
            }

            return cleanExtractedText(text.toString());
        } catch (Exception e) {
            System.err.println("Error extracting PPT text: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract text from Word document (DOCX)
     */
    public String extractDocxText(byte[] docxData) {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(docxData);
             XWPFDocument doc = new XWPFDocument(bis)) {
            StringBuilder text = new StringBuilder();
            
            for (XWPFParagraph para : doc.getParagraphs()) {
                text.append(para.getText()).append("\n");
            }
            
            return cleanExtractedText(text.toString());
        } catch (Exception e) {
            System.err.println("Error extracting DOCX text: " + e.getMessage());
            return null;
        }
    }
    /**
     * Clean and truncate extracted text
     */
    private String cleanExtractedText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        // Keep line structure for slide-by-slide/document section responses.
        text = text.replace("\r\n", "\n").replace('\r', '\n');
        text = text.replaceAll("[\\t\\x0B\\f ]+", " ");
        text = text.replaceAll(" *\n *", "\n");
        text = text.replaceAll("\n{3,}", "\n\n").trim();

        // Limit context size for AI processing (max 8000 chars)
        int maxLength = 8000;
        if (text.length() > maxLength) {
            text = text.substring(0, maxLength) + "... [content truncated]";
        }

        return text;
    }

    /**
     * Detect file type from base64 data and extract text
     */
    public String extractFileContent(String base64Data) {
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return null;
        }

        try {
            // Remove data URL prefix if present
            String base64 = base64Data;
            String mimeType = "application/octet-stream";
            
            if (base64Data.contains(",")) {
                String[] parts = base64Data.split(",");
                String prefix = parts[0];
                base64 = parts[1];
                
                Pattern pattern = Pattern.compile("data:([^;]+)");
                Matcher matcher = pattern.matcher(prefix);
                if (matcher.find()) {
                    mimeType = matcher.group(1);
                }
            }

            byte[] fileData = java.util.Base64.getDecoder().decode(base64);
            System.out.println("📄 Extracting text from file type: " + mimeType + ", size: " + fileData.length + " bytes");

            String lowerMimeType = mimeType.toLowerCase();

            if (lowerMimeType.contains("pdf")) {
                return extractPdfText(fileData);
            } else if (lowerMimeType.contains("powerpoint") ||
                    lowerMimeType.contains("presentation") ||
                    lowerMimeType.contains("pptx")) {
                return extractPptText(fileData);
            } else if (lowerMimeType.contains("msword") ||
                    lowerMimeType.contains("wordprocessingml") ||
                    lowerMimeType.contains("document") ||
                    lowerMimeType.contains("docx")) {
                return extractDocxText(fileData);
            } else if (lowerMimeType.startsWith("text/") ||
                    lowerMimeType.contains("json") ||
                    lowerMimeType.contains("xml") ||
                    lowerMimeType.contains("csv") ||
                    lowerMimeType.contains("javascript")) {
                return cleanExtractedText(new String(fileData, StandardCharsets.UTF_8));
            } else {
                System.out.println("Unsupported file type: " + mimeType);
                return null;
            }
        } catch (Exception e) {
            System.err.println("Error processing file: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public List<String> getAvailableModels() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = restTemplate.getForObject(OLLAMA_TAGS_URL, Map.class);
            if (response != null) {
                List<Map<String, Object>> models = (List<Map<String, Object>>) response.get("models");
                if (models != null) {
                    return models.stream().map(model -> (String) model.get("name")).toList();
                }
            }
        } catch (Exception e) {
            System.out.println("Failed to fetch models from Ollama, using default list: " + e.getMessage());
            return AVAILABLE_MODELS;
        }
        return AVAILABLE_MODELS;
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




