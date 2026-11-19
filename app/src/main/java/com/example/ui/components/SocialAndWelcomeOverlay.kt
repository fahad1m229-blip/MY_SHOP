package com.example.ui.components

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.R
import com.example.model.PopupNoticeConfig
import com.example.model.SocialPlatformConfig
import com.example.model.SocialSupportSettings
import com.example.model.isSafeExternalUrl
import com.example.model.parseHexColor
import com.example.ui.theme.LocalMyShopColors
import kotlinx.coroutines.delay

fun launchSafeSocialUrl(
    context: Context,
    platform: SocialPlatformConfig,
    onFeedback: (String) -> Unit,
    onTrackClick: (String) -> Unit
) {
    onTrackClick(platform.id)
    if (!isSafeExternalUrl(platform.url)) {
        onFeedback("${platform.name} URL is not configured yet in Admin Panel.")
        return
    }
    try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(platform.url.trim())).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    } catch (_: Exception) {
        onFeedback("Unable to open ${platform.name} link.")
    }
}

@Composable
fun FloatingSocialSupportMenu(
    settings: SocialSupportSettings,
    extraBottomPadding: Dp = 16.dp,
    onTrackClick: (String) -> Unit,
    onFeedback: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!settings.enabled) return
    val enabledPlatforms = remember(settings.platforms) {
        settings.platforms.filter { it.enabled }.sortedBy { it.sortOrder }
    }
    if (enabledPlatforms.isEmpty()) return

    val context = LocalContext.current
    val ext = LocalMyShopColors.current
    var expanded by remember { mutableStateOf(false) }

    BackHandler(enabled = expanded) {
        expanded = false
    }

    val primaryColor = parseHexColor(settings.primaryHex, ext.neonPurple)
    val menuBgColor = parseHexColor(settings.menuBgHex, Color(0xFF140F2A))
    val fabSize = when (settings.buttonSize) {
        "COMPACT" -> 48.dp
        "LARGE" -> 64.dp
        else -> 56.dp
    }

    val alignment = when (settings.position) {
        "TOP_RIGHT" -> Alignment.TopEnd
        "MID_RIGHT" -> Alignment.CenterEnd
        else -> Alignment.BottomEnd
    }
    val expandDownward = settings.position == "TOP_RIGHT"

    val infiniteTransition = rememberInfiniteTransition(label = "social_fab_idle")
    val floatOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = if (settings.animationStyle == "SPRING_3D") -8f else -5f,
        animationSpec = infiniteRepeatable(
            animation = tween(1900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "float_y"
    )
    val haloScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = if (settings.animationStyle == "PULSE_ORBIT") 1.24f else 1.14f,
        animationSpec = infiniteRepeatable(
            animation = tween(1700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "halo_scale"
    )
    val iconRotation by animateFloatAsState(
        targetValue = if (expanded) 45f else 0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "plus_to_x"
    )

    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = alignment
    ) {
        Column(
            modifier = Modifier
                .padding(
                    end = 14.dp,
                    top = if (settings.position == "TOP_RIGHT") 16.dp else 0.dp,
                    bottom = if (settings.position == "BOTTOM_RIGHT") extraBottomPadding else 0.dp
                ),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (!expandDownward) {
                SocialPlatformStack(
                    expanded = expanded,
                    welcomeText = settings.welcomeText,
                    menuBgColor = menuBgColor,
                    platforms = enabledPlatforms,
                    onClickPlatform = { platform ->
                        launchSafeSocialUrl(context, platform, onFeedback, onTrackClick)
                        expanded = false
                    }
                )
            }

            // Floating Circular 3D Neon + / X Trigger Button
            Box(
                modifier = Modifier
                    .size(fabSize + 10.dp)
                    .graphicsLayer {
                        translationY = if (expanded) 0f else floatOffset
                    },
                contentAlignment = Alignment.Center
            ) {
                // Pulsing Neon Halo Ring
                Box(
                    modifier = Modifier
                        .size(fabSize)
                        .graphicsLayer {
                            scaleX = haloScale
                            scaleY = haloScale
                            alpha = if (expanded) 0.55f else 0.36f
                        }
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(primaryColor.copy(alpha = 0.7f), ext.electricBlue.copy(alpha = 0.25f), Color.Transparent)
                            )
                        )
                )

                Surface(
                    onClick = { expanded = !expanded },
                    shape = CircleShape,
                    color = Color.Transparent,
                    shadowElevation = 14.dp,
                    border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.42f)),
                    modifier = Modifier
                        .size(fabSize)
                        .shadow(14.dp, CircleShape, ambientColor = primaryColor, spotColor = ext.electricBlue)
                        .testTag("floating_social_support_fab")
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.linearGradient(
                                    colors = if (expanded) {
                                        listOf(ext.hotPink, primaryColor)
                                    } else {
                                        listOf(primaryColor, ext.electricBlue)
                                    }
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Add,
                            contentDescription = if (expanded) "Close social support menu" else "Open social support menu",
                            tint = Color.White,
                            modifier = Modifier
                                .size(if (settings.buttonSize == "COMPACT") 24.dp else 28.dp)
                                .graphicsLayer { rotationZ = iconRotation }
                        )
                    }
                }
            }

            if (expandDownward) {
                SocialPlatformStack(
                    expanded = expanded,
                    welcomeText = settings.welcomeText,
                    menuBgColor = menuBgColor,
                    platforms = enabledPlatforms,
                    onClickPlatform = { platform ->
                        launchSafeSocialUrl(context, platform, onFeedback, onTrackClick)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun SocialPlatformStack(
    expanded: Boolean,
    welcomeText: String,
    menuBgColor: Color,
    platforms: List<SocialPlatformConfig>,
    onClickPlatform: (SocialPlatformConfig) -> Unit
) {
    val ext = LocalMyShopColors.current
    AnimatedVisibility(
        visible = expanded,
        enter = fadeIn(tween(180)) + expandVertically(expandFrom = Alignment.Bottom),
        exit = fadeOut(tween(150)) + shrinkVertically(shrinkTowards = Alignment.Bottom)
    ) {
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = menuBgColor.copy(alpha = 0.94f),
            border = BorderStroke(
                1.dp,
                Brush.linearGradient(listOf(ext.neonPurple.copy(alpha = 0.7f), ext.electricBlue.copy(alpha = 0.6f)))
            ),
            shadowElevation = 18.dp,
            modifier = Modifier
                .widthIn(min = 216.dp, max = 264.dp)
                .testTag("floating_social_menu_panel")
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (welcomeText.isNotBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.AutoAwesome,
                            contentDescription = null,
                            tint = ext.electricBlue,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = welcomeText,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.88f),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                platforms.forEachIndexed { index, platform ->
                    StaggeredSocialOptionRow(
                        platform = platform,
                        delayMillis = index * 55,
                        onClick = { onClickPlatform(platform) }
                    )
                }
            }
        }
    }
}

@Composable
private fun StaggeredSocialOptionRow(
    platform: SocialPlatformConfig,
    delayMillis: Int,
    onClick: () -> Unit
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(platform.id) {
        delay(delayMillis.toLong())
        visible = true
    }

    val accent = parseHexColor(platform.colorHex, Color(0xFF8B5CF6))
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(220)) + slideInVertically(initialOffsetY = { it / 2 }) + scaleIn(initialScale = 0.92f)
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(16.dp),
            color = accent.copy(alpha = 0.18f),
            border = BorderStroke(1.dp, accent.copy(alpha = 0.65f)),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .testTag("social_support_option_${platform.id}")
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SocialPlatformBadge(platform = platform, size = 34.dp)
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = platform.name,
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (platform.subtitle.isNotBlank()) {
                        Text(
                            text = platform.subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.72f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                    contentDescription = "Open ${platform.name}",
                    tint = Color.White.copy(alpha = 0.8f),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun SocialPlatformBadge(
    platform: SocialPlatformConfig,
    size: Dp = 32.dp,
    modifier: Modifier = Modifier
) {
    val accent = parseHexColor(platform.colorHex, Color(0xFF8B5CF6))
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(
                if (platform.id == "tiktok") {
                    Brush.linearGradient(listOf(Color(0xFF111827), Color(0xFFFE2C55), Color(0xFF00F2EA)))
                } else {
                    Brush.linearGradient(listOf(accent, accent.copy(alpha = 0.8f)))
                }
            )
            .border(1.dp, Color.White.copy(alpha = 0.35f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        if (isSafeExternalUrl(platform.iconUrl)) {
            AsyncImage(
                model = platform.iconUrl,
                contentDescription = platform.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().clip(CircleShape)
            )
        } else {
            OfficialSocialVectorIcon(platformId = platform.id, modifier = Modifier.size(size * 0.54f))
        }
    }
}

@Composable
private fun OfficialSocialVectorIcon(platformId: String, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        when (platformId.lowercase()) {
            "facebook" -> {
                val path = Path().apply {
                    moveTo(w * 0.65f, h * 0.14f)
                    lineTo(w * 0.50f, h * 0.14f)
                    quadraticTo(w * 0.36f, h * 0.14f, w * 0.36f, h * 0.32f)
                    lineTo(w * 0.36f, h * 0.45f)
                    lineTo(w * 0.24f, h * 0.45f)
                    lineTo(w * 0.24f, h * 0.62f)
                    lineTo(w * 0.36f, h * 0.62f)
                    lineTo(w * 0.36f, h * 0.92f)
                    lineTo(w * 0.55f, h * 0.92f)
                    lineTo(w * 0.55f, h * 0.62f)
                    lineTo(w * 0.70f, h * 0.62f)
                    lineTo(w * 0.73f, h * 0.45f)
                    lineTo(w * 0.55f, h * 0.45f)
                    lineTo(w * 0.55f, h * 0.34f)
                    quadraticTo(w * 0.55f, h * 0.28f, w * 0.64f, h * 0.28f)
                    lineTo(w * 0.72f, h * 0.28f)
                    lineTo(w * 0.72f, h * 0.14f)
                    close()
                }
                drawPath(path, Color.White)
            }
            "youtube" -> {
                val play = Path().apply {
                    moveTo(w * 0.28f, h * 0.18f)
                    lineTo(w * 0.84f, h * 0.50f)
                    lineTo(w * 0.28f, h * 0.82f)
                    close()
                }
                drawPath(play, Color.White)
            }
            "tiktok" -> {
                drawCircle(
                    color = Color.White,
                    radius = w * 0.21f,
                    center = Offset(w * 0.36f, h * 0.70f),
                    style = Stroke(width = w * 0.13f)
                )
                val stem = Path().apply {
                    moveTo(w * 0.52f, h * 0.68f)
                    lineTo(w * 0.52f, h * 0.14f)
                    quadraticTo(w * 0.58f, h * 0.34f, w * 0.82f, h * 0.36f)
                }
                drawPath(stem, Color.White, style = Stroke(width = w * 0.13f, cap = StrokeCap.Round))
            }
            else -> {
                // Telegram paper plane
                val plane = Path().apply {
                    moveTo(w * 0.90f, h * 0.16f)
                    lineTo(w * 0.08f, h * 0.48f)
                    lineTo(w * 0.38f, h * 0.60f)
                    lineTo(w * 0.78f, h * 0.28f)
                    lineTo(w * 0.48f, h * 0.66f)
                    lineTo(w * 0.72f, h * 0.86f)
                    close()
                }
                drawPath(plane, Color.White)
            }
        }
    }
}

@Composable
fun Welcome3DPopupModal(
    popup: PopupNoticeConfig,
    socialSettings: SocialSupportSettings,
    onDismiss: () -> Unit,
    onTrackSocialClick: (String) -> Unit,
    onNavigateRoute: (String) -> Unit,
    onFeedback: (String) -> Unit
) {
    val context = LocalContext.current
    val ext = LocalMyShopColors.current
    val baseBg = parseHexColor(popup.bgHex, Color(0xFF120B29))
    val enabledPlatforms = remember(socialSettings.platforms) {
        socialSettings.platforms.filter { it.enabled }.sortedBy { it.sortOrder }
    }

    // 3D Entrance + gentle ambient perspective animation
    var entered by remember(popup.id) { mutableStateOf(false) }
    LaunchedEffect(popup.id) { entered = true }

    val entryScale by animateFloatAsState(
        targetValue = if (entered) 1f else 0.84f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "popup_scale"
    )
    val entryAlpha by animateFloatAsState(
        targetValue = if (entered) 1f else 0f,
        animationSpec = tween(280),
        label = "popup_alpha"
    )

    val infinite = rememberInfiniteTransition(label = "popup_3d_tilt")
    val tiltX by infinite.animateFloat(
        initialValue = -2.2f,
        targetValue = 2.6f,
        animationSpec = infiniteRepeatable(tween(3400, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "rot_x"
    )
    val tiltY by infinite.animateFloat(
        initialValue = -3.0f,
        targetValue = 3.0f,
        animationSpec = infiniteRepeatable(tween(4200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "rot_y"
    )
    val badgeFloat by infinite.animateFloat(
        initialValue = -4f,
        targetValue = 4f,
        animationSpec = infiniteRepeatable(tween(2200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "float_art"
    )

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.64f))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                shape = RoundedCornerShape(28.dp),
                color = Color.Transparent,
                shadowElevation = 24.dp,
                border = BorderStroke(
                    1.5.dp,
                    Brush.linearGradient(
                        listOf(
                            ext.electricBlue.copy(alpha = 0.85f),
                            ext.neonPurple.copy(alpha = 0.75f),
                            ext.hotPink.copy(alpha = 0.75f)
                        )
                    )
                ),
                modifier = Modifier
                    .widthIn(max = 430.dp)
                    .fillMaxWidth(0.95f)
                    .graphicsLayer {
                        scaleX = entryScale
                        scaleY = entryScale
                        alpha = entryAlpha
                        rotationX = if (popup.animation3D == "PERSPECTIVE_FLIP") tiltX else 0f
                        rotationY = if (popup.animation3D == "PERSPECTIVE_FLIP") tiltY else tiltY * 0.5f
                        cameraDistance = 14f * density
                    }
                    .testTag("welcome_3d_popup_modal")
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    baseBg.copy(alpha = 0.96f),
                                    Color(0xFF1F1147).copy(alpha = 0.96f),
                                    Color(0xFF0A1432).copy(alpha = 0.97f)
                                )
                            )
                        )
                ) {
                    Column(
                        modifier = Modifier
                            .verticalScroll(rememberScrollState())
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Top Header: Animated MY Shop Logo + Tagline + Accessible Close Button
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .graphicsLayer { translationY = badgeFloat * 0.5f }
                                        .clip(RoundedCornerShape(14.dp))
                                        .border(
                                            1.5.dp,
                                            Brush.linearGradient(listOf(ext.neonPurple, ext.electricBlue, ext.hotPink)),
                                            RoundedCornerShape(14.dp)
                                        )
                                ) {
                                    Image(
                                        painter = painterResource(id = R.drawable.myshop_icon),
                                        contentDescription = "MY Shop Logo",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "MY Shop",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White
                                    )
                                    Text(
                                        text = popup.subtitle.ifBlank { "Shop Smart • Live Happy!" },
                                        style = MaterialTheme.typography.labelMedium,
                                        color = ext.electricBlue,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            IconButton(
                                onClick = onDismiss,
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.1f))
                                    .testTag("welcome_popup_close")
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Close,
                                    contentDescription = "Close welcome popup",
                                    tint = Color.White
                                )
                            }
                        }

                        Spacer(Modifier.height(14.dp))

                        // 3D Shopping Illustration Hero Card
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(152.dp)
                                .graphicsLayer { translationY = badgeFloat }
                                .clip(RoundedCornerShape(20.dp))
                                .border(1.dp, Color.White.copy(alpha = 0.18f), RoundedCornerShape(20.dp))
                        ) {
                            if (isSafeExternalUrl(popup.imageUrl)) {
                                AsyncImage(
                                    model = popup.imageUrl,
                                    contentDescription = popup.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Image(
                                    painter = painterResource(id = R.drawable.img_welcome_3d_shopping),
                                    contentDescription = "MY Shop 3D Welcome Illustration",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, Color(0x990D0722))
                                        )
                                    )
                            )
                            Surface(
                                color = ext.neonPurple.copy(alpha = 0.85f),
                                shape = RoundedCornerShape(999.dp),
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(10.dp)
                            ) {
                                Text(
                                    text = "✨ VIP COMMUNITY & DEALS",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        Text(
                            text = popup.title,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )

                        Spacer(Modifier.height(8.dp))

                        Text(
                            text = popup.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.84f),
                            textAlign = TextAlign.Center
                        )

                        // Four Configurable Social Community Buttons
                        if (popup.includeSocialButtons && enabledPlatforms.isNotEmpty()) {
                            Spacer(Modifier.height(16.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                enabledPlatforms.chunked(2).forEach { rowItems ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        rowItems.forEach { platform ->
                                            val accent = parseHexColor(platform.colorHex, ext.electricBlue)
                                            Surface(
                                                onClick = {
                                                    launchSafeSocialUrl(context, platform, onFeedback, onTrackSocialClick)
                                                },
                                                shape = RoundedCornerShape(14.dp),
                                                color = accent.copy(alpha = 0.2f),
                                                border = BorderStroke(1.dp, accent.copy(alpha = 0.7f)),
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .heightIn(min = 48.dp)
                                                    .testTag("welcome_popup_social_${platform.id}")
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    SocialPlatformBadge(platform = platform, size = 28.dp)
                                                    Spacer(Modifier.width(8.dp))
                                                    Text(
                                                        text = platform.name.replace(" Support", ""),
                                                        style = MaterialTheme.typography.labelLarge,
                                                        color = Color.White,
                                                        fontWeight = FontWeight.Bold,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }
                                            }
                                        }
                                        if (rowItems.size == 1) {
                                            Spacer(Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(18.dp))

                        NeonGradientButton(
                            text = popup.buttonText.ifBlank { "Join Our Community" },
                            icon = Icons.Filled.AutoAwesome,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("welcome_popup_cta_button"),
                            onClick = {
                                val dest = popup.buttonUrl.trim()
                                if (isSafeExternalUrl(dest)) {
                                    try {
                                        context.startActivity(
                                            Intent(Intent.ACTION_VIEW, Uri.parse(dest)).apply {
                                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            }
                                        )
                                    } catch (_: Exception) {
                                        onFeedback("Unable to open link.")
                                    }
                                } else {
                                    onNavigateRoute(dest)
                                }
                                onDismiss()
                            }
                        )

                        Spacer(Modifier.height(6.dp))

                        TextButton(
                            onClick = onDismiss,
                            modifier = Modifier.heightIn(min = 48.dp)
                        ) {
                            Text(
                                text = "Continue Shopping",
                                color = Color.White.copy(alpha = 0.72f)
                            )
                        }
                    }
                }
            }
        }
    }
}
