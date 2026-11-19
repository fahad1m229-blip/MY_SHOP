package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.CatalogRepository
import com.example.data.LocalAppPrefs
import com.example.i18n.AppLanguage
import com.example.i18n.AppStrings
import com.example.model.CategoryId
import com.example.model.Product
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors

@Composable
fun HomeScreen(
    strings: AppStrings,
    prefs: LocalAppPrefs,
    wishlistIds: Set<String>,
    flashCountdownSeconds: Long,
    isSignedIn: Boolean,
    onOpenProduct: (String) -> Unit,
    onOpenCategory: (CategoryId) -> Unit,
    onSearchSubmit: (String) -> Unit,
    onOpenBrand: (String) -> Unit,
    onOpenFunZone: () -> Unit,
    onOpenAiAssistant: () -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onDiscoverTreasure: (String, String, String, Int) -> Unit,
    onSignInClick: () -> Unit,
    adminAnnouncement: Pair<String, String>? = null,
    activePopups: List<Pair<String, String>> = emptyList()
) {
    val ext = LocalMyShopColors.current
    var searchInput by remember { mutableStateOf("") }
    var showSuggestions by remember { mutableStateOf(false) }

    val autocompleteResults = remember(searchInput) {
        if (searchInput.isBlank()) emptyList()
        else CatalogRepository.products.filter {
            it.name.contains(searchInput, ignoreCase = true) ||
                it.brand.contains(searchInput, ignoreCase = true) ||
                it.category.titleEn.contains(searchInput, ignoreCase = true)
        }.take(4)
    }

    val flashProducts = remember { CatalogRepository.products.filter { it.flashSale } }
    val todaysDeals = remember { CatalogRepository.products.filter { it.todaysDeal } }
    val trendingProducts = remember { CatalogRepository.products.filter { it.trending } }
    val featuredProducts = remember { CatalogRepository.products.filter { it.featured } }
    val newArrivals = remember { CatalogRepository.products.filter { it.newArrival } }
    val bestSellers = remember { CatalogRepository.products.filter { it.bestSeller } }
    val recentlyViewed = remember(prefs.recentlyViewedIds) {
        prefs.recentlyViewedIds.mapNotNull { CatalogRepository.findProduct(it) }
    }

    val hrs = flashCountdownSeconds / 3600
    val mins = (flashCountdownSeconds % 3600) / 60
    val secs = flashCountdownSeconds % 60
    val countdownText = String.format("%02d:%02d:%02d", hrs, mins, secs)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("home_screen"),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        // Admin-Synced Live Announcement / Popup Notice (from shared Firestore database)
        if (adminAnnouncement != null || activePopups.isNotEmpty()) {
            item {
                val title = activePopups.firstOrNull()?.first ?: adminAnnouncement?.first.orEmpty()
                val body = activePopups.firstOrNull()?.second?.ifBlank { adminAnnouncement?.second.orEmpty() }
                    ?: adminAnnouncement?.second.orEmpty()
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = ext.neonPurple.copy(alpha = 0.16f),
                    border = BorderStroke(1.dp, ext.neonPurple.copy(alpha = 0.5f))
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Campaign, contentDescription = null, tint = ext.hotPink, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            if (body.isNotBlank()) {
                                Text(body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }

        // 1. Guest Browsing Status Strip (Never blocks browsing)
        if (!isSignedIn) {
            item {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clickable(onClick = onSignInClick),
                    shape = RoundedCornerShape(14.dp),
                    color = ext.electricBlue.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, ext.electricBlue.copy(alpha = 0.35f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Outlined.Explore, contentDescription = null, tint = ext.electricBlue, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = strings.guestModeBanner,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Text(
                            text = "Sign In",
                            style = MaterialTheme.typography.labelMedium,
                            color = ext.electricBlue,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // 2. Smart Search Bar with Autocomplete & Popular Suggestions
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                OutlinedTextField(
                    value = searchInput,
                    onValueChange = {
                        searchInput = it
                        showSuggestions = true
                    },
                    placeholder = { Text(strings.searchHint, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search", tint = ext.electricBlue) },
                    trailingIcon = {
                        Row {
                            if (searchInput.isNotEmpty()) {
                                IconButton(onClick = { searchInput = ""; showSuggestions = false }) {
                                    Icon(Icons.Filled.Close, contentDescription = "Clear")
                                }
                            }
                            IconButton(onClick = { onSearchSubmit(searchInput) }) {
                                Icon(Icons.Filled.ArrowForward, contentDescription = "Go", tint = ext.neonPurple)
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ext.electricBlue,
                        unfocusedBorderColor = ext.glassBorder,
                        focusedContainerColor = ext.glassBackground,
                        unfocusedContainerColor = ext.glassBackground
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("home_search_input")
                )

                AnimatedVisibility(visible = showSuggestions && autocompleteResults.isNotEmpty()) {
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp),
                        cornerRadius = 14.dp
                    ) {
                        autocompleteResults.forEach { prod ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        showSuggestions = false
                                        onOpenProduct(prod.id)
                                    }
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(16.dp), tint = ext.electricBlue)
                                Spacer(Modifier.width(10.dp))
                                Text(prod.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                Text(formatBdt(prod.price), style = MaterialTheme.typography.labelMedium, color = ext.electricBlue)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(CatalogRepository.popularSearches) { suggestion ->
                        AssistChip(
                            onClick = { onSearchSubmit(suggestion) },
                            label = { Text(suggestion, style = MaterialTheme.typography.bodySmall) },
                            leadingIcon = {
                                Icon(Icons.Filled.TrendingUp, contentDescription = null, modifier = Modifier.size(14.dp), tint = ext.hotPink)
                            }
                        )
                    }
                }
            }
        }

        // 3. Animated Welcome Hero Banner
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(196.dp),
                cornerRadius = 24.dp,
                glowAccent = ext.hotPink
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    Image(
                        painter = painterResource(id = R.drawable.img_hero_cyber_deals),
                        contentDescription = "MY Shop Hero Cyber Deals",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color(0xE6080515),
                                        Color(0x99080515),
                                        Color.Transparent
                                    )
                                )
                            )
                    )
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(18.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Surface(
                            color = ext.hotPink.copy(alpha = 0.9f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(
                                text = "CYBER MEGA DEALS • UP TO 40% OFF",
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Future Tech & Lifestyle",
                                color = Color.White,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Text(
                                text = "Use code MYSHOP10 • Free delivery over ৳2,000",
                                color = Color.White.copy(alpha = 0.85f),
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(Modifier.height(8.dp))
                            NeonGradientButton(
                                text = "Shop Flash Deals",
                                icon = Icons.Filled.Bolt,
                                onClick = { onSearchSubmit("") }
                            )
                        }
                    }
                }
            }
        }

        // 4. All 16 Dynamic Shopping Categories
        item {
            SectionHeader(title = strings.categoriesTitle, actionText = "All 16", onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(CatalogRepository.categories) { cat ->
                    GlassCard(
                        modifier = Modifier
                            .width(104.dp)
                            .testTag("category_chip_${cat.id.name}"),
                        cornerRadius = 16.dp,
                        glowAccent = cat.accentColor,
                        onClick = { onOpenCategory(cat.id) }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(listOf(cat.accentColor, cat.secondaryColor))
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = categoryIcon(cat.id),
                                    contentDescription = cat.id.titleEn,
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                text = if (prefs.language == AppLanguage.BN) cat.id.titleBn else cat.id.titleEn,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                minLines = 2
                            )
                        }
                    }
                }
            }
        }

        // 5. Flash Sale with Live Countdown
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.FlashOn, contentDescription = null, tint = ext.gold)
                    Spacer(Modifier.width(6.dp))
                    Text(strings.flashSale, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                }
                Surface(
                    color = ext.hotPink.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, ext.hotPink)
                ) {
                    Text(
                        text = "${strings.endsIn} $countdownText",
                        style = MaterialTheme.typography.labelSmall,
                        color = ext.hotPink,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(
                products = flashProducts,
                wishlistIds = wishlistIds,
                compareIds = prefs.compareIds,
                language = prefs.language,
                onOpenProduct = onOpenProduct,
                onAddToCart = onAddToCart,
                onToggleWishlist = onToggleWishlist,
                onToggleCompare = onToggleCompare
            )
        }

        // 6. Hidden Treasure Hunt #1 on Home
        item {
            Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                TreasureChestBadge(
                    treasureId = "treasure_home",
                    alreadyFound = prefs.foundTreasureIds.contains("treasure_home"),
                    label = "Cosmic Vault Chest #1 (৳250 Coupon)",
                    onDiscover = {
                        onDiscoverTreasure("treasure_home", "Cosmic Vault Treasure", "HUNT250", 100)
                    }
                )
            }
        }

        // 7. Free Delivery & Limited Offers Banner
        item {
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                cornerRadius = 18.dp,
                glowAccent = ext.emerald,
                onClick = { onSearchSubmit("") }
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(ext.emerald.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.LocalShipping, contentDescription = null, tint = ext.emerald)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(strings.freeDeliveryBannerTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ext.emerald)
                        Text(strings.freeDeliveryBannerSub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // 8. MY FUN ZONE & MY AI Assistant Highlights
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                GlassCard(
                    modifier = Modifier
                        .weight(1f)
                        .height(160.dp)
                        .testTag("home_funzone_card"),
                    cornerRadius = 18.dp,
                    glowAccent = ext.gold,
                    onClick = onOpenFunZone
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Image(
                            painter = painterResource(id = R.drawable.img_fun_zone_banner),
                            contentDescription = "MY Fun Zone",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0x990B071C))
                        )
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Icon(Icons.Filled.Casino, contentDescription = null, tint = ext.gold)
                            Column {
                                Text(strings.funZoneTitle, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                                Text("Spin, Scratch & Win", color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                GlassCard(
                    modifier = Modifier
                        .weight(1f)
                        .height(160.dp)
                        .testTag("home_ai_card"),
                    cornerRadius = 18.dp,
                    glowAccent = ext.electricBlue,
                    onClick = onOpenAiAssistant
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Image(
                            painter = painterResource(id = R.drawable.img_ai_assistant_avatar),
                            contentDescription = "MY AI Assistant",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0x990B071C))
                        )
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = ext.electricBlue)
                            Column {
                                Text("MY AI Helper", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                                Text("Smart Deals & Compare", color = Color.White.copy(alpha = 0.85f), style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }

        // 9. Today's Deals & Limited-Time Offers
        item {
            SectionHeader(title = strings.todaysDeals, actionText = strings.limitedOffers, onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(todaysDeals, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
        }

        // 10. Trending & Featured
        item {
            SectionHeader(title = strings.trendingNow, actionText = "Explore", onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(trendingProducts, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
        }

        item {
            SectionHeader(title = strings.featuredProducts, actionText = "See All", onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(featuredProducts, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
        }

        // 11. New Arrivals & Best Sellers
        item {
            SectionHeader(title = strings.newArrivals, actionText = "New", onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(newArrivals, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
        }

        item {
            SectionHeader(title = strings.bestSellers, actionText = "Top", onAction = { onSearchSubmit("") })
            Spacer(Modifier.height(10.dp))
            ProductHorizontalStrip(bestSellers, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
        }

        // 12. Recently Viewed (Dynamic)
        if (recentlyViewed.isNotEmpty()) {
            item {
                SectionHeader(title = strings.recentlyViewed, actionText = "", onAction = {})
                Spacer(Modifier.height(10.dp))
                ProductHorizontalStrip(recentlyViewed, wishlistIds, prefs.compareIds, prefs.language, onOpenProduct, onAddToCart, onToggleWishlist, onToggleCompare)
            }
        }

        // 13. Popular Brands
        item {
            SectionHeader(title = strings.popularBrands, actionText = "", onAction = {})
            Spacer(Modifier.height(10.dp))
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(CatalogRepository.brands) { brand ->
                    GlassCard(
                        modifier = Modifier.width(140.dp),
                        cornerRadius = 16.dp,
                        glowAccent = brand.accentColor,
                        onClick = { onOpenBrand(brand.name) }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(brand.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = brand.accentColor)
                            Text(brand.tagline, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        // 14. Customer Reviews Highlight
        item {
            SectionHeader(title = strings.customerReviews, actionText = "", onAction = {})
            Spacer(Modifier.height(10.dp))
            val highlightedReviews = remember {
                CatalogRepository.products.flatMap { p -> p.reviews.map { p.name to it } }.take(4)
            }
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(highlightedReviews) { (prodName, rev) ->
                    GlassCard(modifier = Modifier.width(260.dp), cornerRadius = 16.dp) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                repeat(rev.rating) {
                                    Icon(Icons.Filled.Star, contentDescription = null, tint = ext.gold, modifier = Modifier.size(14.dp))
                                }
                                Spacer(Modifier.width(6.dp))
                                Text("Verified", style = MaterialTheme.typography.labelSmall, color = ext.emerald)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(rev.comment, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(8.dp))
                            Text("${rev.author} • $prodName", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, actionText: String, onAction: () -> Unit) {
    val ext = LocalMyShopColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        if (actionText.isNotEmpty()) {
            Text(
                text = actionText,
                style = MaterialTheme.typography.labelLarge,
                color = ext.electricBlue,
                modifier = Modifier.clickable(onClick = onAction)
            )
        }
    }
}

@Composable
private fun ProductHorizontalStrip(
    products: List<Product>,
    wishlistIds: Set<String>,
    compareIds: List<String>,
    language: AppLanguage,
    onOpenProduct: (String) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(products, key = { it.id }) { prod ->
            ProductGridCard(
                product = prod,
                isWishlisted = wishlistIds.contains(prod.id),
                isCompared = compareIds.contains(prod.id),
                language = language,
                onProductClick = { onOpenProduct(prod.id) },
                onAddToCart = { onAddToCart(prod) },
                onToggleWishlist = { onToggleWishlist(prod) },
                onToggleCompare = { onToggleCompare(prod) },
                modifier = Modifier.width(184.dp)
            )
        }
    }
}
