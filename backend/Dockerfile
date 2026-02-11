# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8082

# Set environment variables with defaults
ENV ONTOP_ENDPOINT_DEFAULT=http://ontop:8080/sparql
ENV ONTOP_ENDPOINT_MYSQL=http://ontop-mysql:8080/sparql

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
