package com.freelang.intellij

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.psi.tree.IElementType
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors

/**
 * FreeLang Syntax Highlighter
 * Maps tokens to colors for IDE display
 */
class FreeLangSyntaxHighlighter : SyntaxHighlighterBase() {
    override fun getHighlightingLexer(): Lexer = FreeLangLexer()

    override fun getTokenHighlights(tokenType: IElementType): Array<TextAttributesKey> {
        return when (tokenType) {
            // Keywords
            FreeLangTokenTypes.KEYWORD_FN,
            FreeLangTokenTypes.KEYWORD_LET,
            FreeLangTokenTypes.KEYWORD_TRAIT,
            FreeLangTokenTypes.KEYWORD_IMPL,
            FreeLangTokenTypes.KEYWORD_IF,
            FreeLangTokenTypes.KEYWORD_ELSE,
            FreeLangTokenTypes.KEYWORD_WHILE,
            FreeLangTokenTypes.KEYWORD_FOR,
            FreeLangTokenTypes.KEYWORD_RETURN,
            FreeLangTokenTypes.KEYWORD_TYPE,
            FreeLangTokenTypes.KEYWORD_BREAK,
            FreeLangTokenTypes.KEYWORD_CONTINUE,
            FreeLangTokenTypes.KEYWORD_WHERE,
            FreeLangTokenTypes.KEYWORD_EXTENDS -> arrayOf(KEYWORD)

            // Type names
            FreeLangTokenTypes.TYPE_NAME -> arrayOf(TYPE_NAME)

            // Literals
            FreeLangTokenTypes.STRING_LITERAL -> arrayOf(STRING)
            FreeLangTokenTypes.NUMBER_LITERAL -> arrayOf(NUMBER)

            // Comments
            FreeLangTokenTypes.LINE_COMMENT,
            FreeLangTokenTypes.BLOCK_COMMENT -> arrayOf(LINE_COMMENT)

            // Identifiers
            FreeLangTokenTypes.IDENTIFIER -> arrayOf(IDENTIFIER)

            // Operators and punctuation
            FreeLangTokenTypes.LPAREN,
            FreeLangTokenTypes.RPAREN,
            FreeLangTokenTypes.LBRACE,
            FreeLangTokenTypes.RBRACE,
            FreeLangTokenTypes.LBRACKET,
            FreeLangTokenTypes.RBRACKET,
            FreeLangTokenTypes.COLON,
            FreeLangTokenTypes.SEMICOLON,
            FreeLangTokenTypes.COMMA,
            FreeLangTokenTypes.DOT,
            FreeLangTokenTypes.ARROW,
            FreeLangTokenTypes.FAT_ARROW,
            FreeLangTokenTypes.PLUS,
            FreeLangTokenTypes.MINUS,
            FreeLangTokenTypes.STAR,
            FreeLangTokenTypes.SLASH,
            FreeLangTokenTypes.PERCENT,
            FreeLangTokenTypes.EQ,
            FreeLangTokenTypes.EQEQ,
            FreeLangTokenTypes.NE,
            FreeLangTokenTypes.LT,
            FreeLangTokenTypes.LE,
            FreeLangTokenTypes.GT,
            FreeLangTokenTypes.GE,
            FreeLangTokenTypes.AND,
            FreeLangTokenTypes.OR,
            FreeLangTokenTypes.NOT -> arrayOf(OPERATOR)

            else -> emptyArray()
        }
    }

    companion object {
        private val KEYWORD = TextAttributesKey.createTextAttributesKey(
            "FREELANG_KEYWORD",
            DefaultLanguageHighlighterColors.KEYWORD
        )

        private val TYPE_NAME = TextAttributesKey.createTextAttributesKey(
            "FREELANG_TYPE_NAME",
            DefaultLanguageHighlighterColors.CLASS_NAME
        )

        private val STRING = TextAttributesKey.createTextAttributesKey(
            "FREELANG_STRING",
            DefaultLanguageHighlighterColors.STRING
        )

        private val NUMBER = TextAttributesKey.createTextAttributesKey(
            "FREELANG_NUMBER",
            DefaultLanguageHighlighterColors.NUMBER
        )

        private val LINE_COMMENT = TextAttributesKey.createTextAttributesKey(
            "FREELANG_LINE_COMMENT",
            DefaultLanguageHighlighterColors.LINE_COMMENT
        )

        private val IDENTIFIER = TextAttributesKey.createTextAttributesKey(
            "FREELANG_IDENTIFIER",
            DefaultLanguageHighlighterColors.IDENTIFIER
        )

        private val OPERATOR = TextAttributesKey.createTextAttributesKey(
            "FREELANG_OPERATOR",
            DefaultLanguageHighlighterColors.OPERATION_SIGN
        )
    }
}

/**
 * Syntax Highlighter Factory
 */
class FreeLangSyntaxHighlighterFactory : com.intellij.openapi.fileTypes.SyntaxHighlighterFactory() {
    override fun getSyntaxHighlighter(
        project: com.intellij.openapi.project.Project?,
        fileType: com.intellij.openapi.fileTypes.FileType?
    ) = FreeLangSyntaxHighlighter()
}
