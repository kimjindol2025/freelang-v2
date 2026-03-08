package com.freelang.intellij

import org.junit.Test
import kotlin.test.assertTrue

/**
 * Unit tests for FreeLang token types
 */
class FreeLangTokenTypesTest {
    @Test
    fun testAllKeywordsExist() {
        val keywords = listOf(
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
            FreeLangTokenTypes.KEYWORD_EXTENDS
        )

        for (keyword in keywords) {
            assertTrue(keyword != null)
        }
    }

    @Test
    fun testAllOperatorsExist() {
        val operators = listOf(
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
            FreeLangTokenTypes.NOT
        )

        for (op in operators) {
            assertTrue(op != null)
        }
    }

    @Test
    fun testAllPunctuationExist() {
        val punctuation = listOf(
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
            FreeLangTokenTypes.FAT_ARROW
        )

        for (punct in punctuation) {
            assertTrue(punct != null)
        }
    }

    @Test
    fun testKeywordSet() {
        val expected = setOf(
            "fn", "let", "trait", "impl", "if", "else", "while", "for",
            "return", "type", "break", "continue", "where", "extends"
        )

        val actual = FreeLangTokenTypes.KEYWORDS

        assertTrue(actual == expected) { "Keyword set should match expected set" }
    }

    @Test
    fun testLiteralsExist() {
        assertTrue(FreeLangTokenTypes.STRING_LITERAL != null)
        assertTrue(FreeLangTokenTypes.NUMBER_LITERAL != null)
    }

    @Test
    fun testCommentsExist() {
        assertTrue(FreeLangTokenTypes.LINE_COMMENT != null)
        assertTrue(FreeLangTokenTypes.BLOCK_COMMENT != null)
    }

    @Test
    fun testIdentifiersExist() {
        assertTrue(FreeLangTokenTypes.IDENTIFIER != null)
        assertTrue(FreeLangTokenTypes.TYPE_NAME != null)
    }
}
