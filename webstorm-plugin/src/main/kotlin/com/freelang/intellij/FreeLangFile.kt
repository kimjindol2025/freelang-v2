package com.freelang.intellij

import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiFile
import com.intellij.psi.impl.PsiFileBase

/**
 * FreeLang PSI File
 * Represents a FreeLang source file in the PSI tree
 */
class FreeLangFile(viewProvider: FileViewProvider) : PsiFileBase(viewProvider, FreeLangLanguage) {
    override fun getFileType() = FreeLangFileType

    override fun toString() = "FreeLang File"
}
