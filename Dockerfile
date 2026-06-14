# Phase 6: multi-stage Dockerfile for the Spring Boot backend.
# Build with:  docker build -t dndassistant-backend .
# Run with:    docker run --rm -p 8081:8081 dndassistant-backend
# In a real deploy, point POSTGRES_URL at a managed Postgres (RDS,
# Cloud SQL, etc.) and supply a real JWT_SECRET via env.

FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY pom.xml ./
COPY mvnw ./
COPY .mvn ./.mvn
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline
COPY src ./src
RUN ./mvnw -B -ntp -DskipTests clean package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/target/dnd-assistant-1.0-SNAPSHOT.jar /app/app.jar

# Defaults — override at runtime via -e or compose.
ENV SERVER_PORT=8081
ENV POSTGRES_URL=jdbc:postgresql://localhost:55432/dnd_assistant
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=pass
ENV FRONTEND_CORS_ORIGINS=http://localhost:3000
ENV JWT_SECRET=dev-secret-change-me-please-32-bytes-minimum

EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
