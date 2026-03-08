package com.freelang.intellij

import com.intellij.lexer.Lexer
import com.intellij.psi.tree.IElementType
import org.junit.Test
import kotlin.test.assertEquals

/**
 * Unit tests for FreeLang Lexer
 */
class FreeLangLexerTest {
    private fun createLexer(): Lexer = FreeLangLexer()

    private fun tokenize(input: String): List<Pair<IElementType?, String>> {
        val lexer = createLexer()
        lexer.start(input)

        val tokens = mutableListOf<Pair<IElementType?, String>>()
        while (lexer.tokenType != null) {
            val tokenType = lexer.tokenType
            val tokenText = input.substring(lexer.tokenStart, lexer.tokenEnd)
            tokens.add(Pair(tokenType, tokenText))
            lexer.advance()
        }
        return tokens
    }

    @Test
    fun testKeywords() {
        val tokens = tokenize("fn let trait impl")
        assertEquals(7, tokens.size) // 4 keywords + 3 whitespace
        assertEquals(FreeLangTokenTypes.KEYWORD_FN, tokens[0].first)
        assertEquals(FreeLangTokenTypes.KEYWORD_LET, tokens[2].first)
        assertEquals(FreeLangTokenTypes.KEYWORD_TRAIT, tokens[4].first)
        assertEquals(FreeLangTokenTypes.KEYWORD_IMPL, tokens[6].first)
    }

    @Test
    fun testIdentifiers() {
        val tokens = tokenize("hello world")
        assertEquals(FreeLangTokenTypes.IDENTIFIER, tokens[0].first)
        assertEquals("hello", tokens[0].second)
        assertEquals(FreeLangTokenTypes.IDENTIFIER, tokens[2].first)
        assertEquals("world", tokens[2].second)
    }

    @Test
    fun testTypeNames() {
        val tokens = tokenize("String Int Bool")
        assertEquals(FreeLangTokenTypes.TYPE_NAME, tokens[0].first)
        assertEquals("String", tokens[0].second)
        assertEquals(FreeLangTokenTypes.TYPE_NAME, tokens[2].first)
        assertEquals("Int", tokens[2].second)
    }

    @Test
    fun testNumbers() {
        val tokens = tokenize("42 3.14 0")
        assertEquals(FreeLangTokenTypes.NUMBER_LITERAL, tokens[0].first)
        assertEquals("42", tokens[0].second)
        assertEquals(FreeLangTokenTypes.NUMBER_LITERAL, tokens[2].first)
        assertEquals("3.14", tokens[2].second)
    }

    @Test
    fun testStrings() {
        val tokens = tokenize("\"hello\" 'world'")
        assertEquals(FreeLangTokenTypes.STRING_LITERAL, tokens[0].first)
        assertEquals("\"hello\"", tokens[0].second)
        assertEquals(FreeLangTokenTypes.STRING_LITERAL, tokens[2].first)
        assertEquals("'world'", tokens[2].second)
    }

    @Test
    fun testLineComment() {
        val tokens = tokenize("// comment")
        assertEquals(FreeLangTokenTypes.LINE_COMMENT, tokens[0].first)
    }

    @Test
    fun testBlockComment() {
        val tokens = tokenize("/* comment */")
        assertEquals(FreeLangTokenTypes.BLOCK_COMMENT, tokens[0].first)
    }

    @Test
    fun testOperators() {
        val tokens = tokenize("+ - * / ==")
        assertEquals(FreeLangTokenTypes.PLUS, tokens[0].first)
        assertEquals(FreeLangTokenTypes.MINUS, tokens[2].first)
        assertEquals(FreeLangTokenTypes.STAR, tokens[4].first)
        assertEquals(FreeLangTokenTypes.SLASH, tokens[6].first)
        assertEquals(FreeLangTokenTypes.EQEQ, tokens[8].first)
    }

    @Test
    fun testArrows() {
        val tokens = tokenize("-> =>")
        assertEquals(FreeLangTokenTypes.ARROW, tokens[0].first)
        assertEquals(FreeLangTokenTypes.FAT_ARROW, tokens[2].first)
    }

    @Test
    fun testParentheses() {
        val tokens = tokenize("( ) { } [ ]")
        assertEquals(FreeLangTokenTypes.LPAREN, tokens[0].first)
        assertEquals(FreeLangTokenTypes.RPAREN, tokens[2].first)
        assertEquals(FreeLangTokenTypes.LBRACE, tokens[4].first)
        assertEquals(FreeLangTokenTypes.RBRACE, tokens[6].first)
        assertEquals(FreeLangTokenTypes.LBRACKET, tokens[8].first)
        assertEquals(FreeLangTokenTypes.RBRACKET, tokens[10].first)
    }

    @Test
    fun testComplexExpression() {
        val input = "fn add(a: Int, b: Int) -> Int { a + b }"
        val tokens = tokenize(input)

        // Should contain keyword, identifier, operators, type names
        val hasKeyword = tokens.any { it.first == FreeLangTokenTypes.KEYWORD_FN }
        val hasIdentifier = tokens.any { it.first == FreeLangTokenTypes.IDENTIFIER }
        val hasTypeName = tokens.any { it.first == FreeLangTokenTypes.TYPE_NAME }
        val hasArrow = tokens.any { it.first == FreeLangTokenTypes.ARROW }
        val hasPlus = tokens.any { it.first == FreeLangTokenTypes.PLUS }

        assert(hasKeyword) { "Should have keyword" }
        assert(hasIdentifier) { "Should have identifier" }
        assert(hasTypeName) { "Should have type name" }
        assert(hasArrow) { "Should have arrow" }
        assert(hasPlus) { "Should have plus operator" }
    }

    @Test
    fun testWhitespaceHandling() {
        val tokens = tokenize("a   b")
        // Should skip/handle whitespace between tokens
        assertEquals(3, tokens.size) // a, whitespace, b
    }
}
