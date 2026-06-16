FROM maven:3.9.9-eclipse-temurin-17 AS dev
WORKDIR /app

COPY libs/ /tmp/libs/
RUN mvn -B install:install-file \
    -Dfile=/tmp/libs/sim-elh-explainer-library-0.0.1.jar \
    -DpomFile=/tmp/libs/sim-elh-explainer-library-0.0.1.pom

COPY pom.xml .
RUN mvn -B -q dependency:go-offline -DskipTests || true

CMD ["mvn", "spring-boot:run"]

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY libs/ /tmp/libs/
RUN mvn -B install:install-file \
    -Dfile=/tmp/libs/sim-elh-explainer-library-0.0.1.jar \
    -DpomFile=/tmp/libs/sim-elh-explainer-library-0.0.1.pom

COPY pom.xml .
COPY src ./src

RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/idmp-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]