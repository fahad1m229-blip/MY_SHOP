package com.example

import com.example.model.PopupNoticeConfig
import com.example.model.SocialSupportSettings
import com.example.model.isSafeExternalUrl
import com.example.model.parseHexColor
import androidx.compose.ui.graphics.Color
import org.junit.Assert.*
import org.junit.Test

class ExampleUnitTest {
  @Test
  fun addition_isCorrect() {
    assertEquals(4, 2 + 2)
  }

  @Test
  fun safeExternalUrl_blocksUnsafeSchemesAndBlank() {
    assertFalse(isSafeExternalUrl(""))
    assertFalse(isSafeExternalUrl("   "))
    assertFalse(isSafeExternalUrl("javascript:alert(1)"))
    assertFalse(isSafeExternalUrl("intent://open"))
    assertTrue(isSafeExternalUrl("https://example.com/support"))
    assertTrue(isSafeExternalUrl("http://localhost:8080/page"))
  }

  @Test
  fun defaultSocialPlatforms_haveNoHardcodedUrls() {
    val defaults = SocialSupportSettings()
    assertEquals(4, defaults.platforms.size)
    assertTrue(defaults.platforms.all { it.url.isBlank() })
  }

  @Test
  fun parseHexColor_handlesValidAndFallback() {
    val parsed = parseHexColor("#7C3AED", Color.Black)
    assertNotEquals(Color.Black, parsed)
    val fallback = parseHexColor("invalid", Color.Red)
    assertEquals(Color.Red, fallback)
  }

  @Test
  fun popupDefaults_areConfiguredCleanly() {
    val popup = PopupNoticeConfig()
    assertEquals("Welcome to MY Shop!", popup.title)
    assertEquals("Shop Smart • Live Happy!", popup.subtitle)
    assertTrue(popup.includeSocialButtons)
  }
}
