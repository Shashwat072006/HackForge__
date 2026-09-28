# ========================================================
# Hackforge - Multi-stage Production Dockerfile
# Combines React 19 Frontend + Spring Boot 3 Backend
# ========================================================

# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY leavema/package*.json ./
RUN npm ci
COPY leavema/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM eclipse-temurin:21-jdk-alpine AS backend-builder
WORKDIR /app/backend
COPY leave-management/.mvn .mvn
COPY leave-management/mvnw leave-management/pom.xml ./
RUN chmod +x ./mvnw
COPY leave-management/src ./src
# Embed compiled frontend assets into Spring Boot's classpath
COPY --from=frontend-builder /app/frontend/dist/ ./src/main/resources/static/
RUN ./mvnw clean package -DskipTests

# Stage 3: Lightweight Production Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=backend-builder /app/backend/target/*.jar app.jar
RUN mkdir -p /app/data && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=demo
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
