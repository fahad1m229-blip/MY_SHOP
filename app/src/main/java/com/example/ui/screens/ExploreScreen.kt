package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.data.CatalogRepository
import com.example.data.LocalAppPrefs
import com.example.i18n.AppLanguage
import com.example.i18n.AppStrings
import com.example.model.CategoryId
import com.example.model.Product
import com.example.model.SortOption
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors
import com.example.viewmodel.FilterState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    strings: AppStrings,
    products: List<Product>,
    filterState: FilterState,
    prefs: LocalAppPrefs,
    wishlistIds: Set<String>,
    onUpdateQuery: (String) -> Unit,
    onSelectCategory: (CategoryId?) -> Unit,
    onSelectBrand: (String?) -> Unit,
    onUpdateFilters: (Double, Double, Boolean, SortOption) -> Unit,
    onResetFilters: () -> Unit,
    onOpenProduct: (String) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onRemoveCompare: (String) -> Unit,
    onDiscoverTreasure: (String, String, String, Int) -> Unit
) {
    val ext = LocalMyShopColors.current
    var showFilterSheet by remember { mutableStateOf(false) }
    var showCompareSheet by remember { mutableStateOf(false) }

    val compareProducts = remember(prefs.compareIds) {
        prefs.compareIds.mapNotNull { CatalogRepository.findProduct(it) }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .testTag("explore_screen")
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Search & Filter Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = filterState.query,
                    onValueChange = onUpdateQuery,
                    placeholder = { Text(strings.searchHint, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = ext.electricBlue) },
                    trailingIcon = {
                        if (filterState.query.isNotEmpty()) {
                            IconButton(onClick = { onUpdateQuery("") }) {
                                Icon(Icons.Filled.Close, contentDescription = "Clear")
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("explore_search_input")
                )

                FilledTonalIconButton(
                    onClick = { showFilterSheet = true },
                    modifier = Modifier
                        .size(52.dp)
                        .testTag("open_filters_button")
                ) {
                    Icon(Icons.Filled.Tune, contentDescription = "Filters", tint = ext.neonPurple)
                }
            }

            // Category Pills
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                item {
                    FilterChip(
                        selected = filterState.selectedCategory == null,
                        onClick = { onSelectCategory(null) },
                        label = { Text(if (prefs.language == AppLanguage.BN) "সব" else "All") }
                    )
                }
                items(CatalogRepository.categories) { cat ->
                    FilterChip(
                        selected = filterState.selectedCategory == cat.id,
                        onClick = {
                            onSelectCategory(if (filterState.selectedCategory == cat.id) null else cat.id)
                        },
                        label = { Text(if (prefs.language == AppLanguage.BN) cat.id.titleBn else cat.id.titleEn) },
                        leadingIcon = {
                            Icon(categoryIcon(cat.id), contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    )
                }
            }

            // Active Filter / Sort Summary Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${products.size} products • ${if (prefs.language == AppLanguage.BN) filterState.sortOption.labelBn else filterState.sortOption.labelEn}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (filterState.selectedBrand != null || filterState.selectedCategory != null || filterState.freeDeliveryOnly || filterState.minRating > 0) {
                    Text(
                        text = "Reset",
                        style = MaterialTheme.typography.labelMedium,
                        color = ext.hotPink,
                        modifier = Modifier.clickable(onClick = onResetFilters)
                    )
                }
            }

            if (products.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Outlined.SearchOff, contentDescription = null, modifier = Modifier.size(64.dp), tint = ext.neonPurple)
                        Spacer(Modifier.height(12.dp))
                        Text("No matching products", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(6.dp))
                        Text("Try clearing filters or asking MY AI Assistant!", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(14.dp))
                        NeonGradientButton(text = "Reset All Filters", onClick = onResetFilters)
                    }
                }
            } else {
                BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                    val columns = when {
                        maxWidth >= 900.dp -> 4
                        maxWidth >= 600.dp -> 3
                        else -> 2
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(columns),
                        contentPadding = PaddingValues(
                            start = 16.dp,
                            end = 16.dp,
                            top = 8.dp,
                            bottom = if (compareProducts.isNotEmpty()) 96.dp else 24.dp
                        ),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item(span = { GridItemSpan(columns) }) {
                            TreasureChestBadge(
                                treasureId = "treasure_explore",
                                alreadyFound = prefs.foundTreasureIds.contains("treasure_explore"),
                                label = "Explorer's Neon Chest (৳250 Coupon)",
                                onDiscover = {
                                    onDiscoverTreasure("treasure_explore", "Explorer Treasure", "HUNTEXPLORE", 100)
                                }
                            )
                        }
                        items(products, key = { it.id }) { prod ->
                            ProductGridCard(
                                product = prod,
                                isWishlisted = wishlistIds.contains(prod.id),
                                isCompared = prefs.compareIds.contains(prod.id),
                                language = prefs.language,
                                onProductClick = { onOpenProduct(prod.id) },
                                onAddToCart = { onAddToCart(prod) },
                                onToggleWishlist = { onToggleWishlist(prod) },
                                onToggleCompare = { onToggleCompare(prod) }
                            )
                        }
                    }
                }
            }
        }

        // Compare Tray Bar (up to 4 products)
        if (compareProducts.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(14.dp),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                border = BorderStroke(1.dp, ext.neonPurple)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Compare Products (${compareProducts.size}/4)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = compareProducts.joinToString(" vs ") { it.name.take(16) },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    NeonGradientButton(
                        text = "Compare",
                        icon = Icons.Outlined.CompareArrows,
                        onClick = { showCompareSheet = true },
                        modifier = Modifier.testTag("open_compare_sheet")
                    )
                }
            }
        }
    }

    if (showFilterSheet) {
        ModalBottomSheet(onDismissRequest = { showFilterSheet = false }) {
            var tempPrice by remember { mutableFloatStateOf(filterState.maxPrice.toFloat()) }
            var tempRating by remember { mutableDoubleStateOf(filterState.minRating) }
            var tempFreeDel by remember { mutableStateOf(filterState.freeDeliveryOnly) }
            var tempSort by remember { mutableStateOf(filterState.sortOption) }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Filter & Sort", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

                Text("Sort By", style = MaterialTheme.typography.titleSmall)
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SortOption.entries.forEach { opt ->
                        FilterChip(
                            selected = tempSort == opt,
                            onClick = { tempSort = opt },
                            label = { Text(if (prefs.language == AppLanguage.BN) opt.labelBn else opt.labelEn) }
                        )
                    }
                }

                Text("Brands", style = MaterialTheme.typography.titleSmall)
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = filterState.selectedBrand == null,
                        onClick = { onSelectBrand(null) },
                        label = { Text("All Brands") }
                    )
                    CatalogRepository.brands.forEach { b ->
                        FilterChip(
                            selected = filterState.selectedBrand == b.name,
                            onClick = { onSelectBrand(if (filterState.selectedBrand == b.name) null else b.name) },
                            label = { Text(b.name) }
                        )
                    }
                }

                Text("Max Price: ${formatBdt(tempPrice.toDouble())}", style = MaterialTheme.typography.titleSmall)
                Slider(
                    value = tempPrice,
                    onValueChange = { tempPrice = it },
                    valueRange = 1000f..140000f
                )

                Text("Minimum Rating", style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(0.0 to "Any", 4.0 to "4.0★+", 4.5 to "4.5★+", 4.8 to "4.8★+").forEach { (r, label) ->
                        FilterChip(
                            selected = tempRating == r,
                            onClick = { tempRating = r },
                            label = { Text(label) }
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Free Delivery Only", style = MaterialTheme.typography.titleSmall)
                    Switch(checked = tempFreeDel, onCheckedChange = { tempFreeDel = it })
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        onClick = {
                            onResetFilters()
                            showFilterSheet = false
                        },
                        modifier = Modifier.weight(1f)
                    ) { Text("Reset") }
                    NeonGradientButton(
                        text = "Apply Filters",
                        onClick = {
                            onUpdateFilters(tempPrice.toDouble(), tempRating, tempFreeDel, tempSort)
                            showFilterSheet = false
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }

    if (showCompareSheet && compareProducts.isNotEmpty()) {
        ModalBottomSheet(onDismissRequest = { showCompareSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 28.dp)
            ) {
                Text("Side-by-Side Comparison (${compareProducts.size}/4)", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    compareProducts.forEach { p ->
                        GlassCard(modifier = Modifier.width(190.dp), cornerRadius = 16.dp, glowAccent = p.accentColor) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(p.brand, style = MaterialTheme.typography.labelSmall, color = ext.electricBlue)
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = "Remove",
                                        modifier = Modifier
                                            .size(18.dp)
                                            .clickable { onRemoveCompare(p.id) }
                                    )
                                }
                                ProductVisualArt(p, modifier = Modifier.fillMaxWidth().height(76.dp).background(Color.Transparent), iconSize = 34.dp)
                                Text(p.name, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text(formatBdt(p.price), style = MaterialTheme.typography.titleMedium, color = ext.electricBlue, fontWeight = FontWeight.Bold)
                                Text("Discount: ${p.discountPercent}%", style = MaterialTheme.typography.bodySmall)
                                Text("Rating: ${p.rating}★ (${p.reviewCount})", style = MaterialTheme.typography.bodySmall)
                                Text("Stock: ${p.stock} left", style = MaterialTheme.typography.bodySmall)
                                Text("Delivery: ${if (p.freeDelivery) "Free" else "৳80"} (${p.deliveryDaysMin}-${p.deliveryDaysMax}d)", style = MaterialTheme.typography.bodySmall)
                                HorizontalDivider()
                                p.specs.take(3).forEach { spec ->
                                    Text("${spec.label}: ${spec.value}", style = MaterialTheme.typography.bodySmall, maxLines = 2)
                                }
                                Spacer(Modifier.height(4.dp))
                                FilledTonalButton(onClick = { onAddToCart(p) }, modifier = Modifier.fillMaxWidth()) {
                                    Text("Add to Cart")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
