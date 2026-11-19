package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import coil.compose.AsyncImage
import com.example.auth.signOut
import com.example.data.CatalogRepository
import com.example.data.LocalAppPrefs
import com.example.i18n.AppStrings
import com.example.model.*
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors
import com.google.firebase.auth.FirebaseUser

@Composable
fun AccountDashboardScreen(
    strings: AppStrings,
    currentUser: FirebaseUser?,
    userProfile: UserProfile?,
    prefs: LocalAppPrefs,
    orders: List<OrderRecord>,
    wishlistIds: Set<String>,
    rewards: List<RewardRecord>,
    notifications: List<NotificationRecord>,
    addresses: List<SavedAddress>,
    onRequestSignIn: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenProduct: (String) -> Unit,
    onSaveAddress: (String, String, String, String, String, String, String, Boolean) -> Unit,
    onDeleteAddress: (String) -> Unit,
    onToggleLanguage: () -> Unit,
    onToggleDarkMode: () -> Unit,
    onUpdateNotificationPrefs: (Boolean, Boolean, Boolean) -> Unit,
    isUploadingAvatar: Boolean = false,
    onUploadAvatar: (Uri) -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }
    val ext = LocalMyShopColors.current

    var showAddressDialog by remember { mutableStateOf(false) }
    val avatarPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) onUploadAvatar(uri)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("account_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Profile Overview
        item {
            GlassCard(cornerRadius = 22.dp, glowAccent = ext.neonPurple) {
                if (currentUser == null) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier.size(60.dp).clip(CircleShape).background(Brush.linearGradient(listOf(ext.neonPurple, ext.electricBlue))),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(34.dp))
                        }
                        Text("Guest Shopper Mode", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(
                            "Sign in with Google to view your cloud Orders, Saved Addresses, Wallet, and sync your cart across devices.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        NeonGradientButton(
                            text = strings.signInWithGoogle,
                            icon = Icons.Filled.Login,
                            onClick = onRequestSignIn,
                            modifier = Modifier.fillMaxWidth().testTag("account_signin_button")
                        )
                    }
                } else {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        val photoUrl = userProfile?.photoUrl?.takeIf { it.isNotBlank() } ?: currentUser.photoUrl?.toString().orEmpty()
                        Box(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(ext.neonPurple, ext.hotPink)))
                                .clickable(enabled = !isUploadingAvatar) {
                                    avatarPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isUploadingAvatar) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                            } else if (photoUrl.isNotBlank()) {
                                AsyncImage(
                                    model = photoUrl,
                                    contentDescription = "Profile photo",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Text(
                                    (userProfile?.displayName ?: currentUser.displayName ?: "M").take(1).uppercase(),
                                    color = Color.White,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(userProfile?.displayName ?: currentUser.displayName ?: "MY Shopper", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(currentUser.email.orEmpty(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Google Verified • Tap photo to upload", style = MaterialTheme.typography.labelSmall, color = ext.emerald)
                        }
                        IconButton(onClick = { signOut(credentialManager, scope) }) {
                            Icon(Icons.Outlined.Logout, contentDescription = strings.signOut, tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }

        // Dashboard Metrics Grid
        item {
            val activeOrders = orders.count { it.orderStatus !in listOf("Delivered", "Cancelled", "Refunded") }
            val points = userProfile?.points?.toInt() ?: prefs.guestPoints
            val wallet = userProfile?.walletBalance ?: 0.0
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    StatTile("Orders", "${orders.size} ($activeOrders active)", Icons.Outlined.LocalShipping, ext.electricBlue, Modifier.weight(1f), onOpenOrders)
                    StatTile("Wishlist", "${wishlistIds.size} items", Icons.Outlined.FavoriteBorder, ext.hotPink, Modifier.weight(1f)) {}
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    StatTile("MY Points", "$points pts", Icons.Outlined.Stars, ext.gold, Modifier.weight(1f)) {}
                    StatTile("MY Wallet", formatBdt(wallet), Icons.Outlined.AccountBalanceWallet, ext.emerald, Modifier.weight(1f)) {}
                }
            }
        }

        // Quick Actions
        item {
            GlassCard(cornerRadius = 18.dp) {
                Column(modifier = Modifier.padding(8.dp)) {
                    DashboardMenuRow(strings.myOrders, "${orders.size} total orders", Icons.Outlined.Inventory2, onOpenOrders)
                    HorizontalDivider()
                    DashboardMenuRow(strings.notifications, "${notifications.count { !it.read }} unread alerts", Icons.Outlined.Notifications, onOpenNotifications)
                    HorizontalDivider()
                    DashboardMenuRow(strings.customerSupport, "AI Help, Tickets & FAQ", Icons.Outlined.SupportAgent, onOpenSupport)
                }
            }
        }

        // Saved Wishlist Preview
        if (wishlistIds.isNotEmpty()) {
            item {
                Text("${strings.myWishlist} (${wishlistIds.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                wishlistIds.mapNotNull { CatalogRepository.findProduct(it) }.take(4).forEach { prod ->
                    GlassCard(cornerRadius = 14.dp, onClick = { onOpenProduct(prod.id) }, modifier = Modifier.padding(bottom = 8.dp)) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            ProductVisualArt(prod, modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)), iconSize = 22.dp)
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(prod.name, style = MaterialTheme.typography.titleSmall)
                                Text(formatBdt(prod.price), style = MaterialTheme.typography.labelMedium, color = ext.electricBlue)
                            }
                            Icon(Icons.Filled.ChevronRight, contentDescription = null)
                        }
                    }
                }
            }
        }

        // Saved Delivery Addresses
        if (currentUser != null) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(strings.myAddresses, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { showAddressDialog = true }) { Text("+ Add") }
                }
                if (addresses.isEmpty()) {
                    Text("No saved addresses yet.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    addresses.forEach { addr ->
                        GlassCard(cornerRadius = 14.dp, modifier = Modifier.padding(bottom = 8.dp)) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("${addr.label} • ${addr.recipientName}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text("${addr.phone} • ${addr.street}, ${addr.city}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                IconButton(onClick = { onDeleteAddress(addr.id) }) {
                                    Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Available Coupons & Rewards
        item {
            Text(strings.myRewards, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            (rewards.map { "${it.couponCode.ifBlank { it.title }} (${it.source})" } + CatalogRepository.builtInCoupons.map { "${it.code} • ${it.title}" })
                .distinct()
                .forEach { label ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = ext.gold.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, ext.gold.copy(alpha = 0.4f))
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.ConfirmationNumber, contentDescription = null, tint = ext.gold, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
        }

        // App & Notification Settings
        item {
            GlassCard(cornerRadius = 18.dp) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Preferences & Notifications", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    SettingSwitchRow("Bengali Language (বাংলা)", prefs.language.code == "BN") { onToggleLanguage() }
                    SettingSwitchRow("Futuristic Dark Theme", prefs.darkMode) { onToggleDarkMode() }
                    if (userProfile != null) {
                        SettingSwitchRow("Order & Delivery Alerts", userProfile.orderAlertsOptIn) {
                            onUpdateNotificationPrefs(userProfile.marketingOptIn, it, userProfile.priceDropOptIn)
                        }
                        SettingSwitchRow("Price-Drop Alerts", userProfile.priceDropOptIn) {
                            onUpdateNotificationPrefs(userProfile.marketingOptIn, userProfile.orderAlertsOptIn, it)
                        }
                        SettingSwitchRow("Flash Sale & Promo Alerts", userProfile.marketingOptIn) {
                            onUpdateNotificationPrefs(it, userProfile.orderAlertsOptIn, userProfile.priceDropOptIn)
                        }
                    }
                }
            }
        }
    }

    if (showAddressDialog) {
        var label by remember { mutableStateOf("Home") }
        var name by remember { mutableStateOf(userProfile?.displayName ?: "") }
        var phone by remember { mutableStateOf("") }
        var street by remember { mutableStateOf("") }
        var city by remember { mutableStateOf("Dhaka") }

        AlertDialog(
            onDismissRequest = { showAddressDialog = false },
            title = { Text("Add Delivery Address") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = label, onValueChange = { label = it }, label = { Text("Label") })
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Recipient Name") })
                    OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") })
                    OutlinedTextField(value = street, onValueChange = { street = it }, label = { Text("Street / Area") })
                    OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("City") })
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (name.isNotBlank() && phone.length >= 5 && street.length >= 3) {
                        onSaveAddress(label, name, phone, street, city, "", "Bangladesh", true)
                        showAddressDialog = false
                    }
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showAddressDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun StatTile(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, accent: Color, modifier: Modifier, onClick: () -> Unit) {
    GlassCard(modifier = modifier, cornerRadius = 16.dp, glowAccent = accent, onClick = onClick) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(26.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(title, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun DashboardMenuRow(title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = LocalMyShopColors.current.electricBlue)
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Filled.ChevronRight, contentDescription = null)
    }
}

@Composable
private fun SettingSwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    orders: List<OrderRecord>,
    onBack: () -> Unit,
    onRetryPayment: (OrderRecord) -> Unit,
    onCancelOrder: (OrderRecord) -> Unit,
    onRequestReturn: (OrderRecord) -> Unit,
    onAdvanceTracking: (OrderRecord) -> Unit,
    onReorder: (OrderRecord) -> Unit
) {
    BackHandler { onBack() }
    val context = LocalContext.current
    val ext = LocalMyShopColors.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Orders") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                }
            )
        }
    ) { padding ->
        if (orders.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.Inventory2, contentDescription = null, modifier = Modifier.size(64.dp), tint = ext.neonPurple)
                    Spacer(Modifier.height(10.dp))
                    Text("No orders placed yet", style = MaterialTheme.typography.titleMedium)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).testTag("orders_screen"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(orders, key = { it.id }) { order ->
                    GlassCard(cornerRadius = 18.dp, glowAccent = ext.electricBlue) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(order.orderNumber, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Surface(color = ext.neonPurple.copy(alpha = 0.22f), shape = RoundedCornerShape(8.dp)) {
                                    Text(order.orderStatus, color = ext.electricBlue, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                            Text(order.itemsSummary, style = MaterialTheme.typography.bodyMedium)
                            Text("Ship to: ${order.shippingAddress}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Payment: ${order.paymentMethod} (${order.paymentStatus})", style = MaterialTheme.typography.labelSmall, color = ext.gold)
                                Text(formatBdt(order.totalAmount), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = ext.electricBlue)
                            }
                            if (order.transactionRef.isNotBlank()) {
                                Text("Tx Ref: ${order.transactionRef}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (order.trackingCode.isNotBlank()) {
                                Text("Tracking: ${order.trackingCode}", style = MaterialTheme.typography.bodySmall, color = ext.emerald)
                            }

                            // Order Tracking Timeline
                            val steps = listOf("Pending", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered")
                            val curIdx = steps.indexOf(order.orderStatus)
                            if (curIdx >= 0) {
                                LinearProgressIndicator(
                                    progress = { (curIdx + 1).toFloat() / steps.size.toFloat() },
                                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(4.dp)),
                                    color = ext.emerald
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                if (order.paymentStatus == "PENDING") {
                                    Button(onClick = { onRetryPayment(order) }) { Text("Complete Payment") }
                                }
                                if (order.orderStatus in listOf("Pending", "Confirmed")) {
                                    OutlinedButton(onClick = { onCancelOrder(order) }) { Text("Cancel") }
                                }
                                if (order.orderStatus in listOf("Confirmed", "Processing", "Shipped", "Out for Delivery")) {
                                    FilledTonalButton(onClick = { onAdvanceTracking(order) }) { Text("Simulate Next Stage") }
                                }
                                if (order.orderStatus == "Delivered") {
                                    OutlinedButton(onClick = { onRequestReturn(order) }) { Text("Return") }
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = { onReorder(order) }) {
                                    Icon(Icons.Outlined.Replay, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Reorder")
                                }
                                TextButton(onClick = {
                                    val invoice = """
                                        MY SHOP INVOICE
                                        Order: ${order.orderNumber}
                                        Status: ${order.orderStatus} | Payment: ${order.paymentMethod} (${order.paymentStatus})
                                        Ref: ${order.transactionRef}
                                        Items: ${order.itemsSummary}
                                        Total: ${formatBdt(order.totalAmount)}
                                        Ship To: ${order.shippingAddress}
                                    """.trimIndent()
                                    val intent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, invoice)
                                    }
                                    context.startActivity(Intent.createChooser(intent, "Export Invoice"))
                                }) {
                                    Icon(Icons.Outlined.ReceiptLong, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Download Invoice")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    notifications: List<NotificationRecord>,
    onBack: () -> Unit,
    onMarkRead: (String) -> Unit
) {
    BackHandler { onBack() }
    val ext = LocalMyShopColors.current
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                }
            )
        }
    ) { padding ->
        if (notifications.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("You're all caught up! Order, Flash Sale & Reward alerts appear here.")
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(notifications, key = { it.id }) { n ->
                    GlassCard(
                        cornerRadius = 14.dp,
                        glowAccent = if (!n.read) ext.hotPink else null,
                        onClick = { onMarkRead(n.id) }
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(n.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(n.category, style = MaterialTheme.typography.labelSmall, color = ext.electricBlue)
                            }
                            Text(n.body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(
    tickets: List<SupportTicketRecord>,
    aiReply: String?,
    isAiLoading: Boolean,
    onBack: () -> Unit,
    onAskSupportAi: (String) -> Unit,
    onSubmitTicket: (String, String, String, String) -> Unit
) {
    BackHandler { onBack() }
    val ext = LocalMyShopColors.current
    var aiQuery by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var orderId by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Order") }
    var message by remember { mutableStateOf("") }

    val faqs = remember {
        listOf(
            "How fast is delivery?" to "1-2 days in Dhaka, 2-4 days nationwide. Orders >= ৳2,000 ship free.",
            "Are mobile payments safe?" to "Yes! We use verified merchant gateways (currently Sandbox Test Mode) and never store PINs or OTPs.",
            "How do returns & refunds work?" to "Request a return within 7 days from My Orders. Verified refunds return to your source or MY Wallet."
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Customer Support") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).testTag("support_screen"),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // AI Support Helper
            item {
                GlassCard(cornerRadius = 18.dp, glowAccent = ext.electricBlue) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("AI Instant Support Helper", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = aiQuery,
                                onValueChange = { aiQuery = it },
                                placeholder = { Text("Ask about refunds, delivery, payments...") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            Button(onClick = { onAskSupportAi(aiQuery) }, enabled = !isAiLoading) {
                                Text(if (isAiLoading) "..." else "Ask")
                            }
                        }
                        if (aiReply != null) {
                            Text(aiReply, style = MaterialTheme.typography.bodySmall, color = ext.electricBlue)
                        }
                    }
                }
            }

            // Create Support Ticket
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Submit Support Ticket / Contact Form", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        OutlinedTextField(value = subject, onValueChange = { subject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = orderId, onValueChange = { orderId = it }, label = { Text("Order ID (Optional)") }, modifier = Modifier.weight(1f))
                            OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Topic") }, modifier = Modifier.weight(1f))
                        }
                        OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Message") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                        NeonGradientButton(
                            text = "Submit Ticket",
                            icon = Icons.Filled.ConfirmationNumber,
                            onClick = {
                                onSubmitTicket(subject, orderId, category, message)
                                subject = ""; orderId = ""; message = ""
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Existing Tickets
            if (tickets.isNotEmpty()) {
                item { Text("Your Support Tickets", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                items(tickets, key = { it.id }) { t ->
                    GlassCard(cornerRadius = 14.dp) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(t.subject, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(t.status, style = MaterialTheme.typography.labelSmall, color = ext.emerald)
                            }
                            Text("${t.category} ${if (t.orderId.isNotBlank()) "• ${t.orderId}" else ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(t.message, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            // FAQ
            item {
                Text("Frequently Asked Questions", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                faqs.forEach { (q, a) ->
                    GlassCard(cornerRadius = 14.dp, modifier = Modifier.padding(bottom = 8.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(q, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(a, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
