package com.freelang.intellij

import com.intellij.openapi.project.Project
import com.redhat.devtools.lsp4ij.server.ProcessStreamConnectionProvider
import com.redhat.devtools.lsp4ij.server.ServerFactory
import java.io.File

/**
 * FreeLang LSP Server Factory
 * Creates LSP server connections for Node.js-based FreeLang language server
 */
class FreeLangLSPServerFactory : ServerFactory {
    override fun createConnectionProvider(project: Project): ProcessStreamConnectionProvider {
        return FreeLangStreamConnectionProvider(project)
    }
}

/**
 * Stream Connection Provider for FreeLang LSP Server
 */
private class FreeLangStreamConnectionProvider(private val project: Project) : ProcessStreamConnectionProvider() {
    override fun getCommands(): List<String> {
        // Find Node.js executable
        val nodePath = findNodeExecutable()
            ?: throw RuntimeException(
                "Node.js not found. Please install Node.js 18+ from https://nodejs.org " +
                "and add it to your system PATH, then restart the IDE."
            )

        // Find bundled LSP server
        val serverScript = findLSPServer()

        return listOf(nodePath, serverScript)
    }

    override fun start() {
        super.start()
        println("FreeLang LSP Server started")
    }

    /**
     * Find Node.js executable in system PATH
     */
    private fun findNodeExecutable(): String? {
        val nodeCmd = if (System.getProperty("os.name").startsWith("Windows")) "node.exe" else "node"

        val pathEnv = System.getenv("PATH") ?: return null

        return pathEnv.split(File.pathSeparator)
            .map { File(it, nodeCmd) }
            .firstOrNull { it.exists() && it.canExecute() }
            ?.absolutePath
    }

    /**
     * Find bundled LSP server in plugin resources
     */
    private fun findLSPServer(): String {
        val classLoader = javaClass.classLoader
        val resource = classLoader.getResource("lsp/server.js")
            ?: throw RuntimeException(
                "LSP server not found in plugin resources. " +
                "Please rebuild the plugin with LSP server bundled."
            )

        return try {
            File(resource.toURI()).absolutePath
        } catch (e: Exception) {
            throw RuntimeException("Failed to locate LSP server: ${e.message}", e)
        }
    }
}

