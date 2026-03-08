package com.freelang.intellij

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for FreeLang file type registration
 */
class FreeLangFileTypeTest {
    @Test
    fun testFileTypeExists() {
        assertTrue(FreeLangFileType.INSTANCE != null)
    }

    @Test
    fun testFileTypeName() {
        assertEquals("FreeLang", FreeLangFileType.INSTANCE.name)
    }

    @Test
    fun testFileTypeDescription() {
        assertTrue(FreeLangFileType.INSTANCE.description.contains("FreeLang"))
    }

    @Test
    fun testFileTypeLanguage() {
        assertEquals(FreeLangLanguage, FreeLangFileType.INSTANCE.language)
    }

    @Test
    fun testFileTypeExtension() {
        val extensions = FreeLangFileType.INSTANCE.defaultExtension
        assertEquals("fl", extensions)
    }
}
