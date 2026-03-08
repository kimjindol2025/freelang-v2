package com.freelang.intellij

import com.intellij.lang.ASTNode
import com.intellij.lang.ParserDefinition
import com.intellij.lang.PsiParser
import com.intellij.lexer.Lexer
import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IFileElementType
import com.intellij.psi.tree.TokenSet

/**
 * FreeLang Parser Definition
 * Defines how FreeLang code is parsed
 *
 * Note: Full implementation in Phase 4 (Syntax Highlighting)
 */
class FreeLangParserDefinition : ParserDefinition {
    override fun createLexer(): Lexer {
        return FreeLangLexer()
    }

    override fun createParser(project: com.intellij.openapi.project.Project): PsiParser {
        // To be implemented in Phase 4
        throw NotImplementedError("Parser implementation deferred to Phase 4")
    }

    override fun getFileNodeType(): IFileElementType {
        return FILE
    }

    override fun getWhitespaceTokens(): TokenSet {
        return TokenSet.EMPTY
    }

    override fun getCommentTokens(): TokenSet {
        return TokenSet.EMPTY
    }

    override fun getStringLiteralElements(): TokenSet {
        return TokenSet.EMPTY
    }

    override fun createElement(node: ASTNode?): PsiElement {
        return PsiElement { node }
    }

    override fun createFile(viewProvider: FileViewProvider?): PsiFile {
        return FreeLangFile(viewProvider!!)
    }

    companion object {
        private val FILE = IFileElementType(FreeLangLanguage)
    }
}
