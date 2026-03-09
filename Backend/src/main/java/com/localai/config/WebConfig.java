package com.localai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    // JWT filter is registered via SecurityConfig
    // No additional web configuration needed
}
