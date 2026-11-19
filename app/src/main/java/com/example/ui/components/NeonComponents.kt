package com.example.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import com.example.R
import com.example.auth.onGoogleSignInClicked
import com.example.i18n.AppLanguage
import com.example.model.CategoryId
import com.example.model.Product
import com.example.ui.theme.LocalMyShopColors
import java.text.NumberFormat
import java.util.Locale

fun formatBdt(amount: Double): String {
    val nf = NumberFormat.getIntegerInstance(Locale.US)
    return "৳${nf.format(amount.toLong())}"
}

fun categoryIcon(id: CategoryId): ImageVector = when (id) {
    CategoryId.MOBILES -> Icons.Filled.Smartphone
    CategoryId.COMPUTERS -> Icons.Filled.LaptopMac
    CategoryId.ELECTRONICS -> Icons.Filled.Headphones
    CategoryId.FASHION -> Icons.Filled.Checkroom
    CategoryId.SHOES -> Icons.Filled.DirectionsRun
    CategoryId.BEAUTY -> Icons.Filled.Spa
    CategoryId.HOME_LIVING -> Icons.Filled.Chair
    CategoryId.FURNITURE -> Icons.Filled.Weekend
    CategoryId.TOYS -> Icons.Filled.SmartToy
    CategoryId.SPORTS -> Icons.Filled.FitnessCenter
    CategoryId.BOOKS -> Icons.Filled.MenuBook
    CategoryId.GROCERY -> Icons.Filled.ShoppingBasket
    CategoryId.BABY -> Icons.Filled.ChildCare
    CategoryId.ACCESSORIES -> Icons.Filled.Watch
    CategoryId.GAMING -> Icons.Filled.SportsEsports
    CategoryId.AUTOMOTIVE -> Icons.Filled.DirectionsCar
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 20.dp,
    glowAccent: Color? = null,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val ext = LocalMyShopColors.current
    val borderBrush = Brush.linearGradient(
        colors = listOf(
            (glowAccent ?: ext.neonPurple).copy(alpha = 0.55f),
            ext.electricBlue.copy(alpha = 0.35f),
            ext.hotPink.copy(alpha = 0.35f)
        )
    )
    val shape = RoundedCornerShape(cornerRadius)
    Surface(
        modifier = modifier
            .clip(shape)
            .border(width = 1.dp, brush = borderBrush, shape = shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        shape = shape,
        color = ext.glassBackground,
        tonalElevation = 4.dp
    ) {
        Column(content = content)
    }
}

@Composable
fun NeonGradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true
) {
    val ext = LocalMyShopColors.current
    val brush = if (enabled) {
        Brush.horizontalGradient(listOf(ext.neonPurple, ext.hotPink, ext.electricBlue))
    } else {
        Brush.horizontalGradient(listOf(Color.Gray.copy(alpha = 0.4f), Color.Gray.copy(alpha = 0.4f)))
    }
    Box(
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(brush)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text = text,
                color = Color.White,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun MyShopTopHeader(
    language: AppLanguage,
    darkMode: Boolean,
    unreadNotifications: Int,
    onToggleLanguage: () -> Unit,
    onToggleTheme: () -> Unit,
    onNotificationsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val ext = LocalMyShopColors.current
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(
                        1.dp,
                        Brush.linearGradient(listOf(ext.neonPurple, ext.electricBlue, ext.hotPink)),
                        RoundedCornerShape(12.dp)
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
                    style = MaterialTheme.typography.titleLarge.copy(
                        brush = Brush.horizontalGradient(listOf(ext.neonPurple, ext.electricBlue, ext.hotPink))
                    ),
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = if (language == AppLanguage.EN) "Shop Smart • Live Happy!" else "স্মার্ট শপিং • আনন্দময় জীবন!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Surface(
                modifier = Modifier
                    .heightIn(min = 36.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .clickable(onClick = onToggleLanguage)
                    .testTag("language_toggle"),
                shape = RoundedCornerShape(20.dp),
                color = ext.glassBackground,
                border = BorderStroke(1.dp, ext.glassBorder)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Outlined.Translate, contentDescription = "Language", modifier = Modifier.size(14.dp), tint = ext.electricBlue)
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = language.label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            IconButton(
                onClick = onToggleTheme,
                modifier = Modifier
                    .size(40.dp)
                    .testTag("theme_toggle")
            ) {
                Icon(
                    imageVector = if (darkMode) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                    contentDescription = "Toggle theme",
                    tint = ext.gold
                )
            }

            BadgedBox(
                badge = {
                    if (unreadNotifications > 0) {
                        Badge(containerColor = ext.hotPink) {
                            Text(unreadNotifications.toString(), color = Color.White, fontSize = 10.sp)
                        }
                    }
                }
            ) {
                IconButton(
                    onClick = onNotificationsClick,
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("notifications_button")
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

@Composable
fun ProductVisualArt(
    product: Product,
    modifier: Modifier = Modifier,
    iconSize: Dp = 48.dp
) {
    Box(
        modifier = modifier
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        product.accentColor.copy(alpha = 0.28f),
                        product.secondaryColor.copy(alpha = 0.18f),
                        Color(0xFF0E0921).copy(alpha = 0.7f)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(product.accentColor.copy(alpha = 0.4f), Color.Transparent),
                    center = Offset(size.width * 0.25f, size.height * 0.25f),
                    radius = size.minDimension * 0.55f
                )
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(product.secondaryColor.copy(alpha = 0.35f), Color.Transparent),
                    center = Offset(size.width * 0.8f, size.height * 0.8f),
                    radius = size.minDimension * 0.5f
                )
            )
        }
        Icon(
            imageVector = categoryIcon(product.category),
            contentDescription = product.name,
            tint = Color.White.copy(alpha = 0.94f),
            modifier = Modifier
                .size(iconSize)
                .shadow(12.dp, CircleShape, ambientColor = product.accentColor, spotColor = product.secondaryColor)
        )
    }
}

@Composable
fun ProductGridCard(
    product: Product,
    isWishlisted: Boolean,
    isCompared: Boolean,
    language: AppLanguage,
    onProductClick: () -> Unit,
    onAddToCart: () -> Unit,
    onToggleWishlist: () -> Unit,
    onToggleCompare: () -> Unit,
    modifier: Modifier = Modifier
) {
    val ext = LocalMyShopColors.current
    GlassCard(
        modifier = modifier.testTag("product_card_${product.id}"),
        cornerRadius = 18.dp,
        glowAccent = product.accentColor,
        onClick = onProductClick
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(132.dp)
        ) {
            ProductVisualArt(product = product, modifier = Modifier.fillMaxSize(), iconSize = 46.dp)

            if (product.discountPercent > 0) {
                Surface(
                    color = ext.hotPink,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = "-${product.discountPercent}%",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            if (product.freeDelivery) {
                Surface(
                    color = ext.emerald.copy(alpha = 0.9f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = if (language == AppLanguage.EN) "FREE DEL" else "ফ্রি ডেলিভারি",
                        color = Color(0xFF042117),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
            ) {
                IconButton(
                    onClick = onToggleWishlist,
                    modifier = Modifier.size(34.dp)
                ) {
                    Icon(
                        imageVector = if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Wishlist",
                        tint = if (isWishlisted) ext.hotPink else Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = product.brand.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = ext.electricBlue,
                maxLines = 1
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = if (language == AppLanguage.BN) product.nameBn else product.name,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                minLines = 2
            )
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Star, contentDescription = null, tint = ext.gold, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(3.dp))
                Text(
                    text = "${product.rating} (${product.reviewCount})",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = formatBdt(product.price),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = ext.electricBlue
                )
                if (product.originalPrice > product.price) {
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = formatBdt(product.originalPrice),
                        style = MaterialTheme.typography.bodySmall,
                        textDecoration = TextDecoration.LineThrough,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilledTonalButton(
                    onClick = onAddToCart,
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .testTag("add_cart_${product.id}"),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Outlined.AddShoppingCart, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = if (language == AppLanguage.EN) "Add" else "যোগ",
                        fontSize = 12.sp,
                        maxLines = 1
                    )
                }
                IconButton(
                    onClick = onToggleCompare,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (isCompared) ext.neonPurple.copy(alpha = 0.25f)
                            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CompareArrows,
                        contentDescription = "Compare",
                        tint = if (isCompared) ext.neonPurple else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun TreasureChestBadge(
    treasureId: String,
    alreadyFound: Boolean,
    label: String,
    onDiscover: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (alreadyFound) return
    val ext = LocalMyShopColors.current
    val infiniteTransition = rememberInfiniteTransition(label = "treasure_pulse")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.75f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
        label = "alpha"
    )
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onDiscover)
            .testTag("treasure_$treasureId"),
        shape = RoundedCornerShape(14.dp),
        color = ext.gold.copy(alpha = 0.16f * pulse),
        border = BorderStroke(1.dp, ext.gold.copy(alpha = 0.75f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.AutoAwesome, contentDescription = "Hidden Treasure", tint = ext.gold, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(
                text = "Treasure Hunt: $label (Tap to Claim!)",
                style = MaterialTheme.typography.labelMedium,
                color = ext.gold,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthGateBottomSheet(
    reason: String,
    onDismiss: () -> Unit,
    onAuthSuccess: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val ext = LocalMyShopColors.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Brush.linearGradient(listOf(ext.neonPurple, ext.hotPink))),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.LockOpen, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.height(14.dp))
            Text(
                text = "Sign in to Continue",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = reason,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(14.dp))
            Surface(
                color = ext.emerald.copy(alpha = 0.12f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, ext.emerald.copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.ShoppingCartCheckout, contentDescription = null, tint = ext.emerald, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Your guest cart, wishlist & Fun Zone rewards are preserved automatically.",
                        style = MaterialTheme.typography.bodySmall,
                        color = ext.emerald
                    )
                }
            }
            if (errorMessage != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.height(20.dp))
            NeonGradientButton(
                text = if (isLoading) "Connecting Google Sign-In..." else "Continue with Google",
                icon = Icons.Filled.AccountCircle,
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("google_signin_button"),
                onClick = {
                    isLoading = true
                    errorMessage = null
                    onGoogleSignInClicked(
                        context = context,
                        credentialManager = credentialManager,
                        onAuthSuccess = {
                            isLoading = false
                            onAuthSuccess()
                        },
                        onAuthError = { msg ->
                            isLoading = false
                            errorMessage = msg
                        },
                        scope = scope,
                        onAuthCancelled = { isLoading = false }
                    )
                }
            )
            Spacer(Modifier.height(10.dp))
            TextButton(onClick = onDismiss) {
                Text("Continue Guest Browsing")
            }
        }
    }
}
