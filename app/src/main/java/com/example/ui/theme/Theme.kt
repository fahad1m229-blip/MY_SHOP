package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Immutable
data class MyShopExtendedColors(
    val isDark: Boolean,
    val glassBackground: Color,
    val glassBorder: Color,
    val neonPurple: Color,
    val electricBlue: Color,
    val hotPink: Color,
    val emerald: Color,
    val gold: Color,
    val shimmerBase: Color
)

val LocalMyShopColors = staticCompositionLocalOf {
    MyShopExtendedColors(
        isDark = true,
        glassBackground = GlassSurfaceDark,
        glassBorder = BorderGlassDark,
        neonPurple = NeonPurple,
        electricBlue = ElectricBlue,
        hotPink = HotPink,
        emerald = EmeraldMint,
        gold = AmberGold,
        shimmerBase = CosmicMidnight
    )
}

private val MyShopDarkColorScheme = darkColorScheme(
    primary = NeonPurple,
    onPrimary = Color.White,
    primaryContainer = DeepViolet,
    onPrimaryContainer = TextPrimaryDark,
    secondary = ElectricBlue,
    onSecondary = CosmicObsidian,
    secondaryContainer = Color(0xFF0A2E47),
    onSecondaryContainer = ElectricBlue,
    tertiary = HotPink,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFF4A0E33),
    onTertiaryContainer = Color(0xFFFFB8DE),
    background = CosmicObsidian,
    onBackground = TextPrimaryDark,
    surface = CosmicMidnight,
    onSurface = TextPrimaryDark,
    surfaceVariant = GlassSurfaceDark,
    onSurfaceVariant = TextSecondaryDark,
    surfaceContainerHigh = GlassSurfaceElevatedDark,
    outline = BorderGlassDark,
    error = DangerCoral,
    onError = Color.White
)

private val MyShopLightColorScheme = lightColorScheme(
    primary = PrimaryPurpleLight,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEDE9FE),
    onPrimaryContainer = Color(0xFF2E1065),
    secondary = ElectricBlueLight,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE0F2FE),
    onSecondaryContainer = Color(0xFF0C4A6E),
    tertiary = HotPinkLight,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFCE7F3),
    onTertiaryContainer = Color(0xFF831843),
    background = CloudFrost,
    onBackground = TextPrimaryLight,
    surface = PureGlassLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = SoftLavenderLight,
    onSurfaceVariant = TextSecondaryLight,
    surfaceContainerHigh = Color(0xFFE3DDF8),
    outline = BorderGlassLight,
    error = DangerCoral,
    onError = Color.White
)

val MyShopShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(30.dp)
)

@Composable
fun MyShopTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) MyShopDarkColorScheme else MyShopLightColorScheme
    val extendedColors = if (darkTheme) {
        MyShopExtendedColors(
            isDark = true,
            glassBackground = GlassSurfaceDark.copy(alpha = 0.78f),
            glassBorder = BorderGlassDark,
            neonPurple = NeonPurple,
            electricBlue = ElectricBlue,
            hotPink = HotPink,
            emerald = EmeraldMint,
            gold = AmberGold,
            shimmerBase = CosmicMidnight
        )
    } else {
        MyShopExtendedColors(
            isDark = false,
            glassBackground = PureGlassLight.copy(alpha = 0.88f),
            glassBorder = BorderGlassLight,
            neonPurple = PrimaryPurpleLight,
            electricBlue = ElectricBlueLight,
            hotPink = HotPinkLight,
            emerald = EmeraldMintLight,
            gold = Color(0xFFD97706),
            shimmerBase = SoftLavenderLight
        )
    }

    CompositionLocalProvider(LocalMyShopColors provides extendedColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = MyShopTypography,
            shapes = MyShopShapes,
            content = content
        )
    }
}
