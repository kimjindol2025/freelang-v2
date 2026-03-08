package com.freelang.intellij

import com.intellij.lexer.LexerBase
import com.intellij.psi.tree.IElementType

/**
 * FreeLang Lexer
 * Tokenizes FreeLang source code
 */
class FreeLangLexer : LexerBase() {
    private lateinit var buffer: CharSequence
    private var startOffset = 0
    private var endOffset = 0
    private var position = 0
    private var currentToken: IElementType? = null
    private var currentTokenStart = 0

    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        this.buffer = buffer
        this.startOffset = startOffset
        this.endOffset = endOffset
        this.position = startOffset
        this.currentToken = null
        this.currentTokenStart = startOffset
        advance()
    }

    override fun getState(): Int = 0

    override fun getTokenType(): IElementType? = currentToken

    override fun getTokenStart(): Int = currentTokenStart

    override fun getTokenEnd(): Int = position

    override fun advance() {
        if (position >= endOffset) {
            currentToken = null
            return
        }

        currentTokenStart = position
        val ch = buffer[position]

        when {
            // Whitespace
            ch.isWhitespace() -> {
                while (position < endOffset && buffer[position].isWhitespace()) {
                    position++
                }
                currentToken = FreeLangTokenTypes.WHITESPACE
            }

            // Line comment: //
            position + 1 < endOffset && ch == '/' && buffer[position + 1] == '/' -> {
                position += 2
                while (position < endOffset && buffer[position] != '\n') {
                    position++
                }
                currentToken = FreeLangTokenTypes.LINE_COMMENT
            }

            // Block comment: /* */
            position + 1 < endOffset && ch == '/' && buffer[position + 1] == '*' -> {
                position += 2
                while (position + 1 < endOffset) {
                    if (buffer[position] == '*' && buffer[position + 1] == '/') {
                        position += 2
                        break
                    }
                    position++
                }
                currentToken = FreeLangTokenTypes.BLOCK_COMMENT
            }

            // Strings
            ch == '"' -> {
                position++
                while (position < endOffset && buffer[position] != '"') {
                    if (buffer[position] == '\\') position++
                    position++
                }
                if (position < endOffset) position++ // closing quote
                currentToken = FreeLangTokenTypes.STRING_LITERAL
            }

            ch == '\'' -> {
                position++
                while (position < endOffset && buffer[position] != '\'') {
                    if (buffer[position] == '\\') position++
                    position++
                }
                if (position < endOffset) position++ // closing quote
                currentToken = FreeLangTokenTypes.STRING_LITERAL
            }

            // Numbers
            ch.isDigit() -> {
                while (position < endOffset && (buffer[position].isDigit() || buffer[position] == '.')) {
                    position++
                }
                currentToken = FreeLangTokenTypes.NUMBER_LITERAL
            }

            // Identifiers and keywords
            ch.isLetter() || ch == '_' -> {
                val start = position
                while (position < endOffset && (buffer[position].isLetterOrDigit() || buffer[position] == '_')) {
                    position++
                }
                val word = buffer.subSequence(start, position).toString()

                currentToken = when {
                    word in FreeLangTokenTypes.KEYWORDS -> {
                        when (word) {
                            "fn" -> FreeLangTokenTypes.KEYWORD_FN
                            "let" -> FreeLangTokenTypes.KEYWORD_LET
                            "trait" -> FreeLangTokenTypes.KEYWORD_TRAIT
                            "impl" -> FreeLangTokenTypes.KEYWORD_IMPL
                            "if" -> FreeLangTokenTypes.KEYWORD_IF
                            "else" -> FreeLangTokenTypes.KEYWORD_ELSE
                            "while" -> FreeLangTokenTypes.KEYWORD_WHILE
                            "for" -> FreeLangTokenTypes.KEYWORD_FOR
                            "return" -> FreeLangTokenTypes.KEYWORD_RETURN
                            "type" -> FreeLangTokenTypes.KEYWORD_TYPE
                            "break" -> FreeLangTokenTypes.KEYWORD_BREAK
                            "continue" -> FreeLangTokenTypes.KEYWORD_CONTINUE
                            "where" -> FreeLangTokenTypes.KEYWORD_WHERE
                            "extends" -> FreeLangTokenTypes.KEYWORD_EXTENDS
                            else -> FreeLangTokenTypes.IDENTIFIER
                        }
                    }
                    word[0].isUpperCase() -> FreeLangTokenTypes.TYPE_NAME
                    else -> FreeLangTokenTypes.IDENTIFIER
                }
            }

            // Operators and punctuation
            ch == '(' -> {
                position++
                currentToken = FreeLangTokenTypes.LPAREN
            }
            ch == ')' -> {
                position++
                currentToken = FreeLangTokenTypes.RPAREN
            }
            ch == '{' -> {
                position++
                currentToken = FreeLangTokenTypes.LBRACE
            }
            ch == '}' -> {
                position++
                currentToken = FreeLangTokenTypes.RBRACE
            }
            ch == '[' -> {
                position++
                currentToken = FreeLangTokenTypes.LBRACKET
            }
            ch == ']' -> {
                position++
                currentToken = FreeLangTokenTypes.RBRACKET
            }

            ch == ':' && position + 1 < endOffset && buffer[position + 1] == ':' -> {
                position += 2
                currentToken = FreeLangTokenTypes.COLON
            }
            ch == ':' -> {
                position++
                currentToken = FreeLangTokenTypes.COLON
            }
            ch == ';' -> {
                position++
                currentToken = FreeLangTokenTypes.SEMICOLON
            }
            ch == ',' -> {
                position++
                currentToken = FreeLangTokenTypes.COMMA
            }
            ch == '.' -> {
                position++
                currentToken = FreeLangTokenTypes.DOT
            }

            ch == '-' && position + 1 < endOffset && buffer[position + 1] == '>' -> {
                position += 2
                currentToken = FreeLangTokenTypes.ARROW
            }
            ch == '=' && position + 1 < endOffset && buffer[position + 1] == '>' -> {
                position += 2
                currentToken = FreeLangTokenTypes.FAT_ARROW
            }
            ch == '=' && position + 1 < endOffset && buffer[position + 1] == '=' -> {
                position += 2
                currentToken = FreeLangTokenTypes.EQEQ
            }
            ch == '!' && position + 1 < endOffset && buffer[position + 1] == '=' -> {
                position += 2
                currentToken = FreeLangTokenTypes.NE
            }
            ch == '<' && position + 1 < endOffset && buffer[position + 1] == '=' -> {
                position += 2
                currentToken = FreeLangTokenTypes.LE
            }
            ch == '>' && position + 1 < endOffset && buffer[position + 1] == '=' -> {
                position += 2
                currentToken = FreeLangTokenTypes.GE
            }
            ch == '&' && position + 1 < endOffset && buffer[position + 1] == '&' -> {
                position += 2
                currentToken = FreeLangTokenTypes.AND
            }
            ch == '|' && position + 1 < endOffset && buffer[position + 1] == '|' -> {
                position += 2
                currentToken = FreeLangTokenTypes.OR
            }

            ch == '=' -> {
                position++
                currentToken = FreeLangTokenTypes.EQ
            }
            ch == '+' -> {
                position++
                currentToken = FreeLangTokenTypes.PLUS
            }
            ch == '-' -> {
                position++
                currentToken = FreeLangTokenTypes.MINUS
            }
            ch == '*' -> {
                position++
                currentToken = FreeLangTokenTypes.STAR
            }
            ch == '/' -> {
                position++
                currentToken = FreeLangTokenTypes.SLASH
            }
            ch == '%' -> {
                position++
                currentToken = FreeLangTokenTypes.PERCENT
            }
            ch == '<' -> {
                position++
                currentToken = FreeLangTokenTypes.LT
            }
            ch == '>' -> {
                position++
                currentToken = FreeLangTokenTypes.GT
            }
            ch == '!' -> {
                position++
                currentToken = FreeLangTokenTypes.NOT
            }

            else -> {
                position++
                currentToken = FreeLangTokenTypes.BAD_CHARACTER
            }
        }
    }

    override fun getBufferSequence(): CharSequence = buffer

    override fun getBufferEnd(): Int = endOffset
}
