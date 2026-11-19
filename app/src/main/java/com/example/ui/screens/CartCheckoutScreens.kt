package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.data.CatalogRepository
import com.example.i18n.AppStrings
import com.example.model.*
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors
import com.example.viewmodel.CheckoutDraft

@Composable
fun CartScreen(
    strings: AppStrings,
    activeItems: List<CartLineItem>,
    savedItems: List<CartLineItem>,
    availableCoupons: List<CouponRule>,
    appliedCouponCode: String?,
    subtotal: Double,
    discount: Double,
    deliveryFee: Double,
    onUpdateQty: (CartLineItem, Int) -> Unit,
    onToggleSaveForLater: (CartLineItem) -> Unit,
    onRemoveItem: (CartLineItem) -> Unit,
    onApplyCoupon: (String) -> Unit,
    onClearCoupon: () -> Unit,
    onOpenProduct: (String) -> Unit,
    onExploreClick: () -> Unit,
    onProceedCheckout: () -> Unit
) {
    val ext = LocalMyShopColors.current
    var couponInput by remember(appliedCouponCode) { mutableStateOf(appliedCouponCode.orEmpty()) }
    val grandTotal = (subtotal - discount + deliveryFee).coerceAtLeast(0.0)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("cart_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(strings.cartTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }

        if (activeItems.isEmpty()) {
            item {
                GlassCard(cornerRadius = 20.dp) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Outlined.ShoppingCart, contentDescription = null, modifier = Modifier.size(56.dp), tint = ext.neonPurple)
                        Text(strings.emptyCartTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(strings.emptyCartSub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        NeonGradientButton(text = "Browse Deals", onClick = onExploreClick)
                    }
                }
            }
        } else {
            items(activeItems, key = { it.key }) { item ->
                val prod = CatalogRepository.findProduct(item.productId)
                GlassCard(cornerRadius = 16.dp) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (prod != null) {
                            ProductVisualArt(
                                prod,
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { onOpenProduct(prod.id) },
                                iconSize = 30.dp
                            )
                            Spacer(Modifier.width(12.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.productName, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text(
                                listOf(item.selectedColor, item.selectedSize).filter { it.isNotBlank() }.joinToString(" • "),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(formatBdt(item.unitPrice * item.quantity), style = MaterialTheme.typography.titleSmall, color = ext.electricBlue, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                TextButton(onClick = { onToggleSaveForLater(item) }, contentPadding = PaddingValues(0.dp)) {
                                    Text("Save for later", style = MaterialTheme.typography.labelSmall)
                                }
                                Spacer(Modifier.width(12.dp))
                                TextButton(onClick = { onRemoveItem(item) }, contentPadding = PaddingValues(0.dp)) {
                                    Text("Remove", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            IconButton(onClick = { onUpdateQty(item, 1) }, modifier = Modifier.size(34.dp)) {
                                Icon(Icons.Filled.AddCircleOutline, contentDescription = "Increase")
                            }
                            Text("${item.quantity}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            IconButton(onClick = { onUpdateQty(item, -1) }, modifier = Modifier.size(34.dp)) {
                                Icon(Icons.Filled.RemoveCircleOutline, contentDescription = "Decrease")
                            }
                        }
                    }
                }
            }

            // Coupon Box
            item {
                GlassCard(cornerRadius = 18.dp) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(strings.applyCoupon, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = couponInput,
                                onValueChange = { couponInput = it },
                                placeholder = { Text(strings.couponHint) },
                                singleLine = true,
                                modifier = Modifier.weight(1f).testTag("coupon_input")
                            )
                            Button(
                                onClick = {
                                    if (appliedCouponCode != null && couponInput.equals(appliedCouponCode, ignoreCase = true)) {
                                        onClearCoupon()
                                    } else {
                                        onApplyCoupon(couponInput)
                                    }
                                },
                                modifier = Modifier.testTag("apply_coupon_button")
                            ) {
                                Text(if (appliedCouponCode != null) "Clear" else strings.apply)
                            }
                        }
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(availableCoupons) { rule ->
                                AssistChip(
                                    onClick = {
                                        couponInput = rule.code
                                        onApplyCoupon(rule.code)
                                    },
                                    label = { Text("${rule.code} (${rule.title})", style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                    }
                }
            }

            // Totals & Checkout Button
            item {
                GlassCard(cornerRadius = 18.dp, glowAccent = ext.electricBlue) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        PriceRow(strings.subtotal, formatBdt(subtotal))
                        if (discount > 0) PriceRow(strings.discount, "-${formatBdt(discount)}", ext.emerald)
                        PriceRow(strings.deliveryFee, if (deliveryFee == 0.0) "FREE" else formatBdt(deliveryFee), if (deliveryFee == 0.0) ext.emerald else null)
                        HorizontalDivider()
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(strings.total, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(formatBdt(grandTotal), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = ext.electricBlue)
                        }
                        Spacer(Modifier.height(6.dp))
                        NeonGradientButton(
                            text = strings.proceedToCheckout,
                            icon = Icons.Filled.Lock,
                            onClick = onProceedCheckout,
                            modifier = Modifier.fillMaxWidth().testTag("checkout_button")
                        )
                    }
                }
            }
        }

        // Saved for Later
        if (savedItems.isNotEmpty()) {
            item {
                Text("${strings.savedForLater} (${savedItems.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            items(savedItems, key = { "saved_${it.key}" }) { item ->
                GlassCard(cornerRadius = 14.dp) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.productName, style = MaterialTheme.typography.titleSmall)
                            Text(formatBdt(item.unitPrice), style = MaterialTheme.typography.bodyMedium, color = ext.electricBlue)
                        }
                        FilledTonalButton(onClick = { onToggleSaveForLater(item) }) {
                            Text("Move to Cart")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PriceRow(label: String, value: String, valueColor: Color? = null) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = valueColor ?: MaterialTheme.colorScheme.onSurface)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    strings: AppStrings,
    draft: CheckoutDraft,
    addresses: List<SavedAddress>,
    items: List<CartLineItem>,
    subtotal: Double,
    discount: Double,
    deliveryFee: Double,
    onBack: () -> Unit,
    onSetStep: (CheckoutStep) -> Unit,
    onSelectAddress: (String) -> Unit,
    onSaveNewAddress: (String, String, String, String, String, String, String, Boolean) -> Unit,
    onSelectPayment: (PaymentMethodOption) -> Unit,
    onCreateOrder: () -> Unit,
    onVerifySandboxPayment: (String) -> Unit
) {
    BackHandler { onBack() }

    val ext = LocalMyShopColors.current
    val grandTotal = (subtotal - discount + deliveryFee).coerceAtLeast(0.0)
    var showAddAddressForm by remember { mutableStateOf(addresses.isEmpty()) }

    var addrLabel by remember { mutableStateOf("Home") }
    var addrName by remember { mutableStateOf("") }
    var addrPhone by remember { mutableStateOf("") }
    var addrStreet by remember { mutableStateOf("") }
    var addrCity by remember { mutableStateOf("Dhaka") }
    var addrCountry by remember { mutableStateOf("Bangladesh") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.checkoutTitle) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("checkout_screen"),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Stepper Indicator
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    CheckoutStep.entries.forEachIndexed { idx, step ->
                        val active = draft.step.ordinal >= step.ordinal
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (active) ext.neonPurple else MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Text(
                                    "${idx + 1}. ${step.name.lowercase().replaceFirstChar { it.uppercase() }}",
                                    color = if (active) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            when (draft.step) {
                CheckoutStep.ADDRESS -> {
                    item {
                        Text("Step 1: Delivery Address", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    items(addresses, key = { it.id }) { addr ->
                        val formatted = "${addr.recipientName}, ${addr.phone} — ${addr.street}, ${addr.city}, ${addr.country}"
                        val selected = draft.selectedAddressText == formatted
                        GlassCard(
                            cornerRadius = 16.dp,
                            glowAccent = if (selected) ext.electricBlue else null,
                            onClick = { onSelectAddress(formatted) }
                        ) {
                            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(selected = selected, onClick = { onSelectAddress(formatted) })
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text("${addr.label} • ${addr.recipientName}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                    Text("${addr.phone}\n${addr.street}, ${addr.city}, ${addr.country}", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                    item {
                        TextButton(onClick = { showAddAddressForm = !showAddAddressForm }) {
                            Icon(Icons.Filled.AddLocationAlt, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text(if (showAddAddressForm) "Hide New Address Form" else "Add New Delivery Address")
                        }
                        if (showAddAddressForm) {
                            GlassCard(cornerRadius = 16.dp) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = addrLabel, onValueChange = { addrLabel = it }, label = { Text("Label (Home/Office)") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = addrName, onValueChange = { addrName = it }, label = { Text("Recipient Full Name") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = addrPhone, onValueChange = { addrPhone = it }, label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth())
                                    OutlinedTextField(value = addrStreet, onValueChange = { addrStreet = it }, label = { Text("House, Road, Area") }, modifier = Modifier.fillMaxWidth())
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(value = addrCity, onValueChange = { addrCity = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                                        OutlinedTextField(value = addrCountry, onValueChange = { addrCountry = it }, label = { Text("Country") }, modifier = Modifier.weight(1f))
                                    }
                                    Button(
                                        onClick = {
                                            if (addrName.isNotBlank() && addrPhone.length >= 5 && addrStreet.length >= 3) {
                                                onSaveNewAddress(addrLabel, addrName, addrPhone, addrStreet, addrCity, "", addrCountry, true)
                                                showAddAddressForm = false
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth()
                                    ) { Text("Save & Select Address") }
                                }
                            }
                        }
                    }
                    item {
                        NeonGradientButton(
                            text = "Continue to Payment Method",
                            enabled = draft.selectedAddressText.length >= 5,
                            onClick = { onSetStep(CheckoutStep.PAYMENT) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                CheckoutStep.PAYMENT -> {
                    item {
                        Surface(
                            color = ext.gold.copy(alpha = 0.14f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, ext.gold.copy(alpha = 0.5f))
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.VerifiedUser, contentDescription = null, tint = ext.gold)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "${strings.sandboxNotice}. We NEVER store customer PINs, OTPs, or card CVVs.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = ext.gold
                                )
                            }
                        }
                    }
                    PaymentRegion.entries.forEach { region ->
                        item {
                            Text("${region.label} Payment Options", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        val regionMethods = CatalogRepository.paymentMethods.filter { it.region == region }
                        items(regionMethods, key = { it.id }) { method ->
                            val selected = draft.selectedPaymentMethod.id == method.id
                            GlassCard(
                                cornerRadius = 14.dp,
                                glowAccent = if (selected) ext.electricBlue else null,
                                onClick = { onSelectPayment(method) }
                            ) {
                                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    RadioButton(selected = selected, onClick = { onSelectPayment(method) })
                                    Spacer(Modifier.width(8.dp))
                                    Column {
                                        Text(method.displayName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        Text(method.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = { onSetStep(CheckoutStep.ADDRESS) }, modifier = Modifier.weight(1f)) { Text("Back") }
                            NeonGradientButton(text = "Review Order", onClick = { onSetStep(CheckoutStep.REVIEW) }, modifier = Modifier.weight(1f))
                        }
                    }
                }

                CheckoutStep.REVIEW -> {
                    item {
                        GlassCard(cornerRadius = 18.dp) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Order Review", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text("Ship To: ${draft.selectedAddressText}", style = MaterialTheme.typography.bodySmall)
                                Text("Payment: ${draft.selectedPaymentMethod.displayName}", style = MaterialTheme.typography.bodySmall, color = ext.electricBlue)
                                HorizontalDivider()
                                items.forEach { line ->
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("${line.productName} x${line.quantity}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                        Text(formatBdt(line.unitPrice * line.quantity), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                    }
                                }
                                HorizontalDivider()
                                PriceRow(strings.subtotal, formatBdt(subtotal))
                                if (discount > 0) PriceRow(strings.discount, "-${formatBdt(discount)}", ext.emerald)
                                PriceRow(strings.deliveryFee, if (deliveryFee == 0.0) "FREE" else formatBdt(deliveryFee))
                                PriceRow(strings.total, formatBdt(grandTotal), ext.electricBlue)
                            }
                        }
                    }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = { onSetStep(CheckoutStep.PAYMENT) }, modifier = Modifier.weight(1f)) { Text("Back") }
                            NeonGradientButton(
                                text = if (draft.isProcessing) "Creating Order..." else strings.placeOrder,
                                enabled = !draft.isProcessing,
                                onClick = onCreateOrder,
                                modifier = Modifier.weight(1f).testTag("confirm_place_order")
                            )
                        }
                    }
                }

                CheckoutStep.GATEWAY -> {
                    val order = draft.pendingOrder
                    item {
                        GlassCard(cornerRadius = 20.dp, glowAccent = ext.gold) {
                            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.Security, contentDescription = null, tint = ext.gold)
                                    Spacer(Modifier.width(8.dp))
                                    Text("${draft.selectedPaymentMethod.displayName} Sandbox Gateway", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                }
                                Text(
                                    "Order ${order?.orderNumber.orEmpty()} created in PENDING state. " +
                                        "In production, merchant webhooks verify the transaction server-side before marking PAID. " +
                                        "Test any payment outcome below (no PIN/OTP collected):",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text("Payable Amount: ${formatBdt(order?.totalAmount ?: grandTotal)}", style = MaterialTheme.typography.headlineSmall, color = ext.electricBlue, fontWeight = FontWeight.Bold)
                                if (draft.gatewayMessage != null) {
                                    Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(10.dp)) {
                                        Text(draft.gatewayMessage!!, modifier = Modifier.padding(10.dp), style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                                NeonGradientButton(
                                    text = if (draft.isProcessing) "Verifying..." else "Authorize Sandbox Payment",
                                    icon = Icons.Filled.CheckCircle,
                                    enabled = !draft.isProcessing,
                                    onClick = { onVerifySandboxPayment("PAID_SANDBOX") },
                                    modifier = Modifier.fillMaxWidth().testTag("sandbox_authorize_button")
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    OutlinedButton(
                                        onClick = { onVerifySandboxPayment("FAILED") },
                                        enabled = !draft.isProcessing,
                                        modifier = Modifier.weight(1f)
                                    ) { Text("Simulate Failure") }
                                    OutlinedButton(
                                        onClick = { onVerifySandboxPayment("CANCELLED") },
                                        enabled = !draft.isProcessing,
                                        modifier = Modifier.weight(1f)
                                    ) { Text("Cancel Payment") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
