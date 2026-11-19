package com.example.ui.screens

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.example.data.CatalogRepository
import com.example.data.LocalAppPrefs
import com.example.i18n.AppLanguage
import com.example.i18n.AppStrings
import com.example.model.Product
import com.example.model.ProductQA
import com.example.model.ProductReview
import com.example.model.UserReviewRecord
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    product: Product,
    strings: AppStrings,
    prefs: LocalAppPrefs,
    isWishlisted: Boolean,
    isCompared: Boolean,
    userReviews: List<UserReviewRecord>,
    extraQa: List<ProductQA>,
    onBack: () -> Unit,
    onAddToCart: (Product, String, String, Int) -> Unit,
    onBuyNow: (Product, String, String) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onOpenProduct: (String) -> Unit,
    onSubmitReview: (String, Int, String) -> Unit,
    onAskQuestion: (String, String) -> Unit,
    onDiscoverTreasure: (String, String, String, Int) -> Unit,
    onToggleAlerts: () -> Unit
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    val ext = LocalMyShopColors.current
    var selectedColor by remember(product.id) { mutableStateOf(product.colors.firstOrNull().orEmpty()) }
    var selectedSize by remember(product.id) { mutableStateOf(product.sizes.firstOrNull().orEmpty()) }
    var quantity by remember(product.id) { mutableIntStateOf(1) }

    var reviewRating by remember { mutableIntStateOf(5) }
    var reviewText by remember { mutableStateOf("") }
    var questionText by remember { mutableStateOf("") }
    var priceAlertOn by remember { mutableStateOf(false) }
    var stockAlertOn by remember { mutableStateOf(false) }

    val estimatedDelivery = remember(product.id) {
        val fmt = SimpleDateFormat("MMM d", Locale.US)
        val cal1 = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, product.deliveryDaysMin) }
        val cal2 = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, product.deliveryDaysMax) }
        "${fmt.format(cal1.time)} – ${fmt.format(cal2.time)}"
    }

    val allReviews = remember(product.id, userReviews) {
        val cloudMatches = userReviews.filter { it.productId == product.id }.map {
            ProductReview(it.id, it.authorName, it.rating.toInt(), it.comment, "Just now", it.verifiedPurchase)
        }
        cloudMatches + product.reviews
    }

    val allQa = remember(product.id, extraQa) { product.qaList + extraQa }
    val related = remember(product.id) { product.relatedIds.mapNotNull { CatalogRepository.findProduct(it) } }
    val freqBought = remember(product.id) { product.frequentlyBoughtIds.mapNotNull { CatalogRepository.findProduct(it) } }
    val pagerState = rememberPagerState(pageCount = { product.imageViews.size.coerceAtLeast(1) })

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product.brand, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("detail_back_button")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { onToggleWishlist(product) }) {
                        Icon(
                            if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                            contentDescription = strings.wishlist,
                            tint = if (isWishlisted) ext.hotPink else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = { onToggleCompare(product) }) {
                        Icon(
                            Icons.Outlined.CompareArrows,
                            contentDescription = strings.compare,
                            tint = if (isCompared) ext.neonPurple else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(
                                Intent.EXTRA_TEXT,
                                "Check out ${product.name} on MY Shop for ${formatBdt(product.price)} (${product.discountPercent}% off)!"
                            )
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    }) {
                        Icon(Icons.Outlined.Share, contentDescription = strings.share)
                    }
                }
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, ext.glassBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { onAddToCart(product, selectedColor, selectedSize, quantity) },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("detail_add_to_cart"),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Outlined.AddShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(strings.addToCart)
                    }
                    NeonGradientButton(
                        text = strings.buyNow,
                        icon = Icons.Filled.FlashOn,
                        onClick = { onBuyNow(product, selectedColor, selectedSize) },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("detail_buy_now")
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("product_detail_screen"),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Multi-View Gallery
            item {
                GlassCard(cornerRadius = 22.dp, glowAccent = product.accentColor) {
                    Box(modifier = Modifier.fillMaxWidth().height(230.dp)) {
                        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                            Box(modifier = Modifier.fillMaxSize()) {
                                ProductVisualArt(product, modifier = Modifier.fillMaxSize(), iconSize = 84.dp)
                                Surface(
                                    color = Color.Black.copy(alpha = 0.55f),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .align(Alignment.BottomCenter)
                                        .padding(12.dp)
                                ) {
                                    Text(
                                        text = "${product.imageViews.getOrElse(page) { "Product View" }} (${page + 1}/${pagerState.pageCount})",
                                        color = Color.White,
                                        style = MaterialTheme.typography.labelSmall,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                        if (product.discountPercent > 0) {
                            Surface(
                                color = ext.hotPink,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.align(Alignment.TopStart).padding(12.dp)
                            ) {
                                Text(
                                    "-${product.discountPercent}% OFF",
                                    color = Color.White,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Title, Price, Stock, Rating
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text(product.category.titleEn, style = MaterialTheme.typography.labelMedium, color = ext.electricBlue)
                        Surface(
                            color = if (product.stock > 0) ext.emerald.copy(alpha = 0.16f) else MaterialTheme.colorScheme.error.copy(alpha = 0.16f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = if (product.stock > 0) "${strings.inStock} (${product.stock})" else strings.outOfStock,
                                color = if (product.stock > 0) ext.emerald else MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Text(
                        text = if (prefs.language == AppLanguage.BN) product.nameBn else product.name,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(formatBdt(product.price), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold, color = ext.electricBlue)
                        if (product.originalPrice > product.price) {
                            Spacer(Modifier.width(10.dp))
                            Text(formatBdt(product.originalPrice), style = MaterialTheme.typography.titleMedium, textDecoration = TextDecoration.LineThrough, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Star, contentDescription = null, tint = ext.gold, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("${product.rating} • ${product.reviewCount + allReviews.size} reviews", style = MaterialTheme.typography.bodyMedium)
                    }
                    Text(product.description, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // Variants: Color, Size, Quantity
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (product.colors.isNotEmpty()) {
                            Text("Color: $selectedColor", style = MaterialTheme.typography.titleSmall)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(product.colors) { c ->
                                    FilterChip(selected = selectedColor == c, onClick = { selectedColor = c }, label = { Text(c) })
                                }
                            }
                        }
                        if (product.sizes.isNotEmpty()) {
                            Text("Option / Size: $selectedSize", style = MaterialTheme.typography.titleSmall)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(product.sizes) { s ->
                                    FilterChip(selected = selectedSize == s, onClick = { selectedSize = s }, label = { Text(s) })
                                }
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Quantity", style = MaterialTheme.typography.titleSmall)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { if (quantity > 1) quantity-- }) {
                                    Icon(Icons.Filled.RemoveCircleOutline, contentDescription = "Decrease")
                                }
                                Text("$quantity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                IconButton(onClick = { if (quantity < product.stock) quantity++ }) {
                                    Icon(Icons.Filled.AddCircleOutline, contentDescription = "Increase")
                                }
                            }
                        }
                    }
                }
            }

            // Delivery & Seller Info & Alerts
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocalShipping, contentDescription = null, tint = ext.emerald)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = if (product.freeDelivery) "${strings.freeDelivery} • Est. $estimatedDelivery" else "Delivery ৳80 (Free over ৳2,000) • Est. $estimatedDelivery",
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text("7-Day Easy Returns • Cash on Delivery & Sandbox Payments Supported", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        HorizontalDivider()
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Verified, contentDescription = null, tint = ext.electricBlue)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text("${strings.sellerInfo}: ${product.seller.name}", style = MaterialTheme.typography.titleSmall)
                                Text("Rating ${product.seller.rating}★ • Ships from ${product.seller.shipFrom}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        HorizontalDivider()
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Price-Drop Alert", style = MaterialTheme.typography.bodyMedium)
                            Switch(checked = priceAlertOn, onCheckedChange = { priceAlertOn = it; onToggleAlerts() })
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Back-in-Stock Alert", style = MaterialTheme.typography.bodyMedium)
                            Switch(checked = stockAlertOn, onCheckedChange = { stockAlertOn = it; onToggleAlerts() })
                        }
                    }
                }
            }

            // Hidden Treasure Hunt #3
            item {
                TreasureChestBadge(
                    treasureId = "treasure_detail",
                    alreadyFound = prefs.foundTreasureIds.contains("treasure_detail"),
                    label = "Secret Detail Chest (৳250 Coupon)",
                    onDiscover = {
                        onDiscoverTreasure("treasure_detail", "Detail Inspector Treasure", "HUNTDETAIL", 100)
                    }
                )
            }

            // Specifications
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(strings.specifications, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        product.specs.forEach { spec ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(spec.label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(spec.value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }

            // Frequently Bought Together
            if (freqBought.isNotEmpty()) {
                item {
                    Text(strings.frequentlyBoughtTogether, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(freqBought) { fbt ->
                            GlassCard(modifier = Modifier.width(210.dp), cornerRadius = 14.dp, onClick = { onOpenProduct(fbt.id) }) {
                                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    ProductVisualArt(fbt, modifier = Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)), iconSize = 24.dp)
                                    Spacer(Modifier.width(10.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(fbt.name, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                                        Text(formatBdt(fbt.price), style = MaterialTheme.typography.labelLarge, color = ext.electricBlue)
                                    }
                                    IconButton(onClick = { onAddToCart(fbt, fbt.colors.firstOrNull().orEmpty(), fbt.sizes.firstOrNull().orEmpty(), 1) }) {
                                        Icon(Icons.Filled.AddCircle, contentDescription = "Add", tint = ext.neonPurple)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Verified Customer Reviews & Submit Review
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(strings.reviewsAndRatings, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (allReviews.isEmpty()) {
                            Text("No reviews yet. Be the first to review!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            allReviews.forEach { rev ->
                                Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)).padding(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        repeat(rev.rating) { Icon(Icons.Filled.Star, contentDescription = null, tint = ext.gold, modifier = Modifier.size(14.dp)) }
                                        Spacer(Modifier.width(6.dp))
                                        Text(rev.author, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                        Spacer(Modifier.weight(1f))
                                        Text(rev.dateLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Text(rev.comment, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                        HorizontalDivider()
                        Text("Write a Review", style = MaterialTheme.typography.titleSmall)
                        Row {
                            (1..5).forEach { star ->
                                IconButton(onClick = { reviewRating = star }, modifier = Modifier.size(36.dp)) {
                                    Icon(
                                        if (star <= reviewRating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                                        contentDescription = "$star stars",
                                        tint = ext.gold
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = reviewText,
                            onValueChange = { reviewText = it },
                            placeholder = { Text("Share your honest feedback...") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Button(
                            onClick = {
                                onSubmitReview(product.id, reviewRating, reviewText)
                                reviewText = ""
                            },
                            modifier = Modifier.testTag("submit_review_button")
                        ) {
                            Text("Publish Review")
                        }
                    }
                }
            }

            // Q&A Section
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(strings.questionsAndAnswers, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        allQa.forEach { qa ->
                            Column {
                                Text("Q: ${qa.question}", style = MaterialTheme.typography.titleSmall)
                                Text("A: ${qa.answer}", style = MaterialTheme.typography.bodySmall, color = ext.emerald)
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = questionText,
                                onValueChange = { questionText = it },
                                placeholder = { Text("Ask seller a question...") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            FilledTonalButton(onClick = {
                                if (questionText.isNotBlank()) {
                                    onAskQuestion(product.id, questionText)
                                    questionText = ""
                                }
                            }) { Text("Ask") }
                        }
                    }
                }
            }

            // Related Products
            if (related.isNotEmpty()) {
                item {
                    Text(strings.relatedProducts, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(related) { rel ->
                            ProductGridCard(
                                product = rel,
                                isWishlisted = false,
                                isCompared = prefs.compareIds.contains(rel.id),
                                language = prefs.language,
                                onProductClick = { onOpenProduct(rel.id) },
                                onAddToCart = { onAddToCart(rel, rel.colors.firstOrNull().orEmpty(), rel.sizes.firstOrNull().orEmpty(), 1) },
                                onToggleWishlist = { onToggleWishlist(rel) },
                                onToggleCompare = { onToggleCompare(rel) },
                                modifier = Modifier.width(176.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
