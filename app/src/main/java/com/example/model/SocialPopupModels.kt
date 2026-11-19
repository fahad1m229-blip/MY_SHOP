package com.example.model

import androidx.compose.ui.graphics.Color

data class SocialPlatformConfig(
    val id: String,
    val name: String,
    val subtitle: String = "",
    val url: String = "",
    val iconUrl: String = "",
    val colorHex: String = "#8B5CF6",
    val enabled: Boolean = true,
    val sortOrder: Int = 1
)

data class SocialSupportSettings(
    val enabled: Boolean = true,
    val position: String = "BOTTOM_RIGHT", // BOTTOM_RIGHT | MID_RIGHT | TOP_RIGHT
    val buttonSize: String = "MEDIUM", // COMPACT | MEDIUM | LARGE
    val animationStyle: String = "FLOAT_GLOW", // FLOAT_GLOW | PULSE_ORBIT | SPRING_3D
    val menuBgHex: String = "#140F2A",
    val primaryHex: String = "#8B5CF6",
    val welcomeText: String = "Connect with MY Shop Support",
    val platforms: List<SocialPlatformConfig> = defaultSocialPlatforms()
) {
    companion object {
        // NOTE: ZERO hardcoded external social URLs — Admin configures URLs in Super Admin Panel
        fun defaultSocialPlatforms(): List<SocialPlatformConfig> = listOf(
            SocialPlatformConfig(
                id = "facebook",
                name = "Facebook Support",
                subtitle = "Message us on Facebook",
                url = "",
                colorHex = "#1877F2",
                enabled = true,
                sortOrder = 1
            ),
            SocialPlatformConfig(
                id = "youtube",
                name = "YouTube Support",
                subtitle = "Product demos & guides",
                url = "",
                colorHex = "#FF0000",
                enabled = true,
                sortOrder = 2
            ),
            SocialPlatformConfig(
                id = "tiktok",
                name = "TikTok Support",
                subtitle = "Trending flash clips",
                url = "",
                colorHex = "#FE2C55",
                enabled = true,
                sortOrder = 3
            ),
            SocialPlatformConfig(
                id = "telegram",
                name = "Telegram Support",
                subtitle = "Fast VIP community",
                url = "",
                colorHex = "#26A5E4",
                enabled = true,
                sortOrder = 4
            )
        )
    }
}

data class PopupNoticeConfig(
    val id: String = "welcome_3d_default",
    val title: String = "Welcome to MY Shop!",
    val subtitle: String = "Shop Smart • Live Happy!",
    val description: String = "Join our official social communities and never miss exciting offers, updates and support.",
    val imageUrl: String = "",
    val buttonText: String = "Join Our Community",
    val buttonUrl: String = "/explore",
    val designStyle: String = "NEON_GLASS",
    val themeStyle: String = "DARK_NEON",
    val animation3D: String = "PERSPECTIVE_FLIP",
    val bgHex: String = "#120B29",
    val includeSocialButtons: Boolean = true,
    val templateType: String = "WELCOME_3D",
    val frequency: String = "ONCE_PER_DAY", // EVERY_VISIT | ONCE_PER_SESSION | ONCE_PER_DAY | ONCE_PER_WEEK | ONCE_PER_USER
    val delaySeconds: Int = 1,
    val durationSeconds: Int = 0,
    val targetAudience: String = "ALL", // ALL | NEW_VISITORS
    val startDate: String = "",
    val endDate: String = "",
    val active: Boolean = true
)

data class AnnouncementSettings(
    val enabled: Boolean = true,
    val text: String = "",
    val badgeText: String = "FLASH DEAL",
    val bgHex: String = "#8B5CF6",
    val actionUrl: String = ""
)

fun parseHexColor(hex: String?, fallback: Color): Color {
    val clean = hex?.trim()?.removePrefix("#") ?: return fallback
    if (clean.length != 6) return fallback
    return try {
        val rgb = clean.toLong(16)
        Color(0xFF000000L or rgb)
    } catch (_: Exception) {
        fallback
    }
}

fun isSafeExternalUrl(raw: String): Boolean {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return false
    val lower = trimmed.lowercase()
    if (!(lower.startsWith("https://") || lower.startsWith("http://"))) return false
    return trimmed.length > 10 && !lower.contains("javascript:") && !lower.contains(" ")
}
