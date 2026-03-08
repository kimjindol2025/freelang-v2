package com.freelang.intellij

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JLabel
import javax.swing.JTextField
import javax.swing.JButton
import javax.swing.JCheckBox
import java.awt.GridLayout
import java.io.File

/**
 * FreeLang Settings Configurable
 * Provides UI for FreeLang project settings
 */
class FreeLangSettingsConfigurable(private val project: Project) : Configurable {
    private lateinit var panel: JPanel
    private lateinit var nodePathField: JTextField
    private lateinit var enableDiagnosticsCheckBox: JCheckBox
    private lateinit var completionOnDotCheckBox: JCheckBox

    override fun getDisplayName(): String = "FreeLang"

    override fun getHelpTopic(): String = "FreeLang.Settings"

    override fun createComponent(): JComponent {
        panel = JPanel(GridLayout(4, 2, 5, 5))

        // Node.js Path
        panel.add(JLabel("Node.js Path (auto-detect if empty):"))
        nodePathField = JTextField(30)
        panel.add(nodePathField)

        // Browse button
        val browseButton = JButton("Browse...")
        browseButton.addActionListener {
            val initialPath = nodePathField.text.ifEmpty { System.getenv("PATH")?.split(File.pathSeparator)?.firstOrNull() ?: "" }
            // Note: Full file chooser would require IntelliJ API integration
            // For now, users can manually enter the path
        }
        panel.add(browseButton)
        panel.add(JLabel(""))

        // Enable Diagnostics
        panel.add(JLabel("Enable Real-time Diagnostics:"))
        enableDiagnosticsCheckBox = JCheckBox()
        panel.add(enableDiagnosticsCheckBox)

        // Completion on dot
        panel.add(JLabel("Completion on dot (.) character:"))
        completionOnDotCheckBox = JCheckBox()
        panel.add(completionOnDotCheckBox)

        return panel
    }

    override fun isModified(): Boolean {
        val settings = FreeLangProjectService.getInstance(project)
        return (nodePathField.text != settings.nodeJsPath ||
                enableDiagnosticsCheckBox.isSelected != settings.enableDiagnostics ||
                completionOnDotCheckBox.isSelected != settings.completionOnDot)
    }

    override fun apply() {
        val settings = FreeLangProjectService.getInstance(project)
        settings.nodeJsPath = nodePathField.text
        settings.enableDiagnostics = enableDiagnosticsCheckBox.isSelected
        settings.completionOnDot = completionOnDotCheckBox.isSelected
    }

    override fun reset() {
        val settings = FreeLangProjectService.getInstance(project)
        nodePathField.text = settings.nodeJsPath
        enableDiagnosticsCheckBox.isSelected = settings.enableDiagnostics
        completionOnDotCheckBox.isSelected = settings.completionOnDot
    }
}
