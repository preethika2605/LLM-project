package com.localai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
@org.springframework.context.annotation.ComponentScan(basePackages = "com.localai")
@org.springframework.data.mongodb.repository.config.EnableMongoRepositories(basePackages = "com.localai.repository")
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }

    @Bean
    public com.localai.service.OllamaService ollamaService() {
        return new com.localai.service.OllamaService();
    }

    @Bean
    public org.springframework.boot.CommandLineRunner commandLineRunner(
            org.springframework.context.ApplicationContext ctx) {
        return args -> {
            System.out.println("Let's inspect the beans provided by Spring Boot:");
            String[] beanNames = ctx.getBeanDefinitionNames();
            java.util.Arrays.sort(beanNames);
            for (String beanName : beanNames) {
                if (beanName.contains("Controller") || beanName.contains("Service")) {
                    System.out.println(beanName);
                }
            }
            System.out.println("--- End of Bean List ---");
        };
    }

    @org.springframework.web.bind.annotation.RestController
    static class InnerController {
        @org.springframework.web.bind.annotation.GetMapping("/inner")
        public String inner() {
            return "Inner Controller Working";
        }
    }
}
