package com.company.leave.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Single-Page Application (SPA) resource handler.
 * Serves static React assets from classpath:/static/ and routes all client-side
 * SPA page URLs (e.g. /login, /dashboard, /approvals) to index.html, while
 * preserving native routing for /api/**, Swagger UI, and H2 console.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }
                        // Do not route backend endpoints or dev consoles to index.html
                        if (resourcePath.startsWith("api")
                                || resourcePath.startsWith("v3")
                                || resourcePath.startsWith("swagger")
                                || resourcePath.startsWith("h2-console")) {
                            return null;
                        }
                        // Fallback to React index.html for client routes
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
