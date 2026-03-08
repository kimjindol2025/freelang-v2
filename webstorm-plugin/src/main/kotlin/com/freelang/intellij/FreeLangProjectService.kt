package com.freelang.intellij

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project
import com.intellij.util.xmlb.XmlSerializerUtil

/**
 * FreeLang Project Service
 * Manages FreeLang-specific settings per project
 */
@Service(Service.Level.PROJECT)
@State(
    name = "FreeLangSettings",
    storages = [Storage("freelang.xml")]
)
class FreeLangProjectService(private val project: Project) : PersistentStateComponent<FreeLangProjectService> {
    var nodeJsPath: String = "" // Empty = auto-detect from PATH
    var enableDiagnostics: Boolean = true
    var completionOnDot: Boolean = true

    override fun getState(): FreeLangProjectService = this

    override fun loadState(state: FreeLangProjectService) {
        XmlSerializerUtil.copyBean(state, this)
    }

    companion object {
        fun getInstance(project: Project): FreeLangProjectService {
            return project.getService(FreeLangProjectService::class.java)
        }
    }
}
