package com.freelang.intellij

import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

/**
 * FreeLang File Type Definition
 * Associates .fl files with FreeLang language
 */
object FreeLangFileType : LanguageFileType(FreeLangLanguage) {
    override fun getName() = "FreeLang"

    override fun getDescription() = "FreeLang source file"

    override fun getDefaultExtension() = "fl"

    override fun getIcon(): Icon? {
        return FreeLangIcons.FILE
    }
}
