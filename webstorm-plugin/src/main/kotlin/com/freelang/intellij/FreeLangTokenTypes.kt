package com.freelang.intellij

import com.intellij.psi.tree.IElementType
import com.intellij.psi.TokenType

/**
 * FreeLang Token Types
 * Defines all token types used in FreeLang lexer
 */
object FreeLangTokenTypes {
    // ============ KEYWORDS ============
    val KEYWORD_FN = IElementType("KEYWORD_FN", FreeLangLanguage)
    val KEYWORD_LET = IElementType("KEYWORD_LET", FreeLangLanguage)
    val KEYWORD_TRAIT = IElementType("KEYWORD_TRAIT", FreeLangLanguage)
    val KEYWORD_IMPL = IElementType("KEYWORD_IMPL", FreeLangLanguage)
    val KEYWORD_IF = IElementType("KEYWORD_IF", FreeLangLanguage)
    val KEYWORD_ELSE = IElementType("KEYWORD_ELSE", FreeLangLanguage)
    val KEYWORD_WHILE = IElementType("KEYWORD_WHILE", FreeLangLanguage)
    val KEYWORD_FOR = IElementType("KEYWORD_FOR", FreeLangLanguage)
    val KEYWORD_RETURN = IElementType("KEYWORD_RETURN", FreeLangLanguage)
    val KEYWORD_TYPE = IElementType("KEYWORD_TYPE", FreeLangLanguage)
    val KEYWORD_BREAK = IElementType("KEYWORD_BREAK", FreeLangLanguage)
    val KEYWORD_CONTINUE = IElementType("KEYWORD_CONTINUE", FreeLangLanguage)
    val KEYWORD_WHERE = IElementType("KEYWORD_WHERE", FreeLangLanguage)
    val KEYWORD_EXTENDS = IElementType("KEYWORD_EXTENDS", FreeLangLanguage)

    // ============ LITERALS ============
    val STRING_LITERAL = IElementType("STRING_LITERAL", FreeLangLanguage)
    val NUMBER_LITERAL = IElementType("NUMBER_LITERAL", FreeLangLanguage)

    // ============ COMMENTS ============
    val LINE_COMMENT = IElementType("LINE_COMMENT", FreeLangLanguage)
    val BLOCK_COMMENT = IElementType("BLOCK_COMMENT", FreeLangLanguage)

    // ============ IDENTIFIERS & TYPES ============
    val IDENTIFIER = IElementType("IDENTIFIER", FreeLangLanguage)
    val TYPE_NAME = IElementType("TYPE_NAME", FreeLangLanguage)

    // ============ OPERATORS & PUNCTUATION ============
    val LPAREN = IElementType("LPAREN", FreeLangLanguage)
    val RPAREN = IElementType("RPAREN", FreeLangLanguage)
    val LBRACE = IElementType("LBRACE", FreeLangLanguage)
    val RBRACE = IElementType("RBRACE", FreeLangLanguage)
    val LBRACKET = IElementType("LBRACKET", FreeLangLanguage)
    val RBRACKET = IElementType("RBRACKET", FreeLangLanguage)

    val COLON = IElementType("COLON", FreeLangLanguage)
    val SEMICOLON = IElementType("SEMICOLON", FreeLangLanguage)
    val COMMA = IElementType("COMMA", FreeLangLanguage)
    val DOT = IElementType("DOT", FreeLangLanguage)
    val ARROW = IElementType("ARROW", FreeLangLanguage)
    val FAT_ARROW = IElementType("FAT_ARROW", FreeLangLanguage)

    val PLUS = IElementType("PLUS", FreeLangLanguage)
    val MINUS = IElementType("MINUS", FreeLangLanguage)
    val STAR = IElementType("STAR", FreeLangLanguage)
    val SLASH = IElementType("SLASH", FreeLangLanguage)
    val PERCENT = IElementType("PERCENT", FreeLangLanguage)

    val EQ = IElementType("EQ", FreeLangLanguage)
    val EQEQ = IElementType("EQEQ", FreeLangLanguage)
    val NE = IElementType("NE", FreeLangLanguage)
    val LT = IElementType("LT", FreeLangLanguage)
    val LE = IElementType("LE", FreeLangLanguage)
    val GT = IElementType("GT", FreeLangLanguage)
    val GE = IElementType("GE", FreeLangLanguage)

    val AND = IElementType("AND", FreeLangLanguage)
    val OR = IElementType("OR", FreeLangLanguage)
    val NOT = IElementType("NOT", FreeLangLanguage)

    // ============ WHITESPACE & EOF ============
    val WHITESPACE = TokenType.WHITESPACE
    val BAD_CHARACTER = TokenType.BAD_CHARACTER

    // Keyword set for quick lookup
    val KEYWORDS = setOf(
        "fn", "let", "trait", "impl", "if", "else", "while", "for",
        "return", "type", "break", "continue", "where", "extends"
    )
}
