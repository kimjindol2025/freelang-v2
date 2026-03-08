plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.16.0"
}

group = "com.freelang"
version = "2.2.0"

repositories {
    mavenCentral()
}

dependencies {
    // LSP4IJ for Language Server Protocol support
    implementation("com.redhat.devtools.lsp4ij:lsp4ij:0.3.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:1.9.0")
}

intellij {
    version.set("2023.1")
    type.set("WS") // WebStorm
    plugins.set(listOf("com.redhat.devtools.lsp4ij:0.3.0"))
}

tasks {
    patchPluginXml {
        sinceBuild.set("231")
        untilBuild.set("241.*")
    }

    // Copy LSP server from parent project build
    register<Copy>("copyLSPServer") {
        from(project.rootProject.file("dist/lsp"))
        into("src/main/resources/lsp")
        include("server.js")
    }

    // Ensure LSP server is copied before processing resources
    named("processResources") {
        dependsOn("copyLSPServer")
    }

    // Build plugin distribution
    buildPlugin {
        dependsOn("copyLSPServer")
    }

    // Test task
    test {
        useJUnit()
    }
}

kotlin {
    jvmToolchain(17)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
