package com.example.data

import android.content.Context
import com.example.R
import com.example.model.*
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import java.util.UUID

class MyShopFirestoreRepository(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth = Firebase.auth
) {
    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        )
    )

    private fun requireUid(): String =
        auth.currentUser?.uid ?: throw IllegalStateException("User must sign in with Google first.")

    private fun sanitizeId(raw: String): String =
        raw.replace(Regex("[^a-zA-Z0-9_\\-]"), "_").take(120).ifBlank { "item_${System.currentTimeMillis()}" }

    // --- USER PROFILE ---
    fun observeUserProfile(userId: String): Flow<UserProfile?> =
        db.collection("users").document(userId)
            .snapshots()
            .map { snap -> snap.toObject(UserProfile::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun ensureUserProfile(user: FirebaseUser, languageCode: String, darkMode: Boolean): Result<Unit> {
        val path = "users/${user.uid}"
        return try {
            val uid = requireUid()
            check(uid == user.uid)
            val docRef = db.collection("users").document(uid)
            val existing = docRef.get().await()
            if (!existing.exists()) {
                val payload = mapOf(
                    "userId" to uid,
                    "displayName" to (user.displayName?.take(80)?.ifBlank { "MY Shopper" } ?: "MY Shopper"),
                    "email" to (user.email?.take(120) ?: ""),
                    "phone" to (user.phoneNumber?.take(30) ?: ""),
                    "photoUrl" to (user.photoUrl?.toString()?.take(500) ?: ""),
                    "language" to if (languageCode == "BN") "BN" else "EN",
                    "darkMode" to darkMode,
                    "points" to 150L,
                    "walletBalance" to 0.0,
                    "streakCount" to 1L,
                    "lastCheckInDate" to "",
                    "marketingOptIn" to true,
                    "orderAlertsOptIn" to true,
                    "priceDropOptIn" to true,
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                ).filterValues { it != null }
                docRef.set(payload).await()

                // Add welcome notification
                addNotification(
                    uid = uid,
                    title = "Welcome to MY Shop!",
                    body = "You received 150 MY Loyalty Points. Use code MYSHOP10 for 10% off!",
                    category = "REWARD"
                )
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, path)
            Result.failure(e)
        }
    }

    suspend fun updateProfileFields(userId: String, updates: Map<String, Any>): Result<Unit> {
        val path = "users/$userId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val payload = updates.toMutableMap().apply {
                this["updatedAt"] = FieldValue.serverTimestamp()
            }
            db.collection("users").document(uid).update(payload).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    // --- ADDRESSES ---
    fun observeAddresses(userId: String): Flow<List<SavedAddress>> =
        db.collection("users").document(userId).collection("addresses")
            .snapshots()
            .map { snap -> snap.toObjects(SavedAddress::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun saveAddress(userId: String, address: SavedAddress): Result<Unit> {
        val docId = if (address.id.isNotBlank()) sanitizeId(address.id) else "addr_${System.currentTimeMillis()}"
        val path = "users/$userId/addresses/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val docRef = db.collection("users").document(uid).collection("addresses").document(docId)
            val existing = docRef.get().await()
            if (existing.exists()) {
                docRef.update(
                    mapOf(
                        "label" to address.label.take(30).ifBlank { "Home" },
                        "recipientName" to address.recipientName.take(80),
                        "phone" to address.phone.take(30),
                        "street" to address.street.take(200),
                        "city" to address.city.take(60),
                        "postalCode" to address.postalCode.take(20),
                        "country" to address.country.take(60),
                        "defaultAddress" to address.defaultAddress,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.set(
                    mapOf(
                        "userId" to uid,
                        "label" to address.label.take(30).ifBlank { "Home" },
                        "recipientName" to address.recipientName.take(80),
                        "phone" to address.phone.take(30),
                        "street" to address.street.take(200),
                        "city" to address.city.take(60),
                        "postalCode" to address.postalCode.take(20),
                        "country" to address.country.take(60),
                        "defaultAddress" to address.defaultAddress,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, path)
            Result.failure(e)
        }
    }

    suspend fun deleteAddress(userId: String, addressId: String): Result<Unit> {
        val path = "users/$userId/addresses/$addressId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("addresses").document(sanitizeId(addressId)).delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, path)
            Result.failure(e)
        }
    }

    // --- CART SYNC ---
    fun observeCart(userId: String): Flow<List<CartItemRecord>> =
        db.collection("users").document(userId).collection("cart")
            .snapshots()
            .map { snap -> snap.toObjects(CartItemRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun upsertCartItem(userId: String, item: CartLineItem): Result<Unit> {
        val docId = sanitizeId(item.key)
        val path = "users/$userId/cart/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val docRef = db.collection("users").document(uid).collection("cart").document(docId)
            val snap = docRef.get().await()
            if (snap.exists()) {
                docRef.update(
                    mapOf(
                        "quantity" to item.quantity.coerceIn(1, 99).toLong(),
                        "selectedColor" to item.selectedColor.take(40),
                        "selectedSize" to item.selectedSize.take(40),
                        "savedForLater" to item.savedForLater,
                        "unitPrice" to item.unitPrice,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.set(
                    mapOf(
                        "userId" to uid,
                        "productId" to item.productId.take(64),
                        "productName" to item.productName.take(160),
                        "unitPrice" to item.unitPrice,
                        "quantity" to item.quantity.coerceIn(1, 99).toLong(),
                        "selectedColor" to item.selectedColor.take(40),
                        "selectedSize" to item.selectedSize.take(40),
                        "savedForLater" to item.savedForLater,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, path)
            Result.failure(e)
        }
    }

    suspend fun removeCartItem(userId: String, key: String): Result<Unit> {
        val docId = sanitizeId(key)
        val path = "users/$userId/cart/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("cart").document(docId).delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, path)
            Result.failure(e)
        }
    }

    suspend fun clearActiveCart(userId: String, activeKeys: List<String>): Result<Unit> {
        return try {
            val uid = requireUid()
            check(uid == userId)
            val col = db.collection("users").document(uid).collection("cart")
            activeKeys.forEach { key ->
                col.document(sanitizeId(key)).delete().await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, "users/$userId/cart")
            Result.failure(e)
        }
    }

    suspend fun mergeGuestCart(userId: String, guestItems: List<CartLineItem>): Result<Unit> {
        return try {
            val uid = requireUid()
            check(uid == userId)
            guestItems.forEach { item ->
                upsertCartItem(uid, item)
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, "users/$userId/cart")
            Result.failure(e)
        }
    }

    // --- WISHLIST ---
    fun observeWishlist(userId: String): Flow<List<WishlistRecord>> =
        db.collection("users").document(userId).collection("wishlist")
            .snapshots()
            .map { snap -> snap.toObjects(WishlistRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun saveWishlistItem(
        userId: String,
        product: Product,
        priceAlert: Boolean = true,
        stockAlert: Boolean = true
    ): Result<Unit> {
        val docId = sanitizeId(product.id)
        val path = "users/$userId/wishlist/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val docRef = db.collection("users").document(uid).collection("wishlist").document(docId)
            val snap = docRef.get().await()
            if (snap.exists()) {
                docRef.update(
                    mapOf(
                        "priceAlertEnabled" to priceAlert,
                        "stockAlertEnabled" to stockAlert,
                        "targetPrice" to product.price,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.set(
                    mapOf(
                        "userId" to uid,
                        "productId" to product.id.take(64),
                        "productName" to product.name.take(160),
                        "priceAlertEnabled" to priceAlert,
                        "stockAlertEnabled" to stockAlert,
                        "targetPrice" to product.price,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, path)
            Result.failure(e)
        }
    }

    suspend fun removeWishlistItem(userId: String, productId: String): Result<Unit> {
        val docId = sanitizeId(productId)
        val path = "users/$userId/wishlist/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("wishlist").document(docId).delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, path)
            Result.failure(e)
        }
    }

    // --- ORDERS & PAYMENTS ---
    fun observeOrders(userId: String): Flow<List<OrderRecord>> =
        db.collection("users").document(userId).collection("orders")
            .snapshots()
            .map { snap ->
                snap.toObjects(OrderRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: com.google.firebase.Timestamp(0, 0) }
            }

    suspend fun createOrder(
        userId: String,
        items: List<CartLineItem>,
        shippingAddress: String,
        paymentMethod: String,
        couponCode: String,
        subtotal: Double,
        discountAmount: Double,
        deliveryFee: Double,
        totalAmount: Double,
        idempotencyKey: String
    ): Result<OrderRecord> {
        val orderId = sanitizeId("ord_${idempotencyKey.take(24)}")
        val path = "users/$userId/orders/$orderId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val docRef = db.collection("users").document(uid).collection("orders").document(orderId)

            // Idempotency guard: prevent duplicate orders on double tap
            val existingSnap = docRef.get().await()
            if (existingSnap.exists()) {
                val existingOrder = existingSnap.toObject(
                    OrderRecord::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
                if (existingOrder != null) return Result.success(existingOrder)
            }

            val isCod = paymentMethod == "Cash on Delivery"
            val initialPaymentStatus = if (isCod) "COD_PENDING" else "PENDING"
            val initialOrderStatus = if (isCod) "Confirmed" else "Pending"
            val orderNum = "MYS-${(100000..999999).random()}"
            val itemsSummary = items.joinToString(", ") { "${it.productName} x${it.quantity}" }.take(1000)
            val lineItemMaps = items.take(30).map {
                mapOf(
                    "productId" to it.productId,
                    "name" to it.productName.take(100),
                    "qty" to it.quantity.toLong(),
                    "price" to it.unitPrice,
                    "color" to it.selectedColor,
                    "size" to it.selectedSize
                )
            }

            val payload = mapOf(
                "userId" to uid,
                "orderNumber" to orderNum,
                "idempotencyKey" to idempotencyKey.take(80),
                "itemsSummary" to itemsSummary,
                "itemCount" to items.sumOf { it.quantity }.coerceIn(1, 100).toLong(),
                "items" to lineItemMaps,
                "shippingAddress" to shippingAddress.take(300),
                "paymentMethod" to paymentMethod.take(40),
                "paymentStatus" to initialPaymentStatus,
                "orderStatus" to initialOrderStatus,
                "transactionRef" to if (isCod) "COD-ON-DELIVERY" else "",
                "trackingCode" to if (isCod) "MYX-TRK-${orderNum.takeLast(4)}" else "",
                "couponCode" to couponCode.take(40),
                "subtotal" to subtotal,
                "discountAmount" to discountAmount,
                "deliveryFee" to deliveryFee,
                "totalAmount" to totalAmount,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )

            docRef.set(payload).await()
            val created = docRef.get().await().toObject(
                OrderRecord::class.java,
                DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
            ) ?: OrderRecord(
                id = orderId,
                userId = uid,
                orderNumber = orderNum,
                idempotencyKey = idempotencyKey,
                itemsSummary = itemsSummary,
                paymentMethod = paymentMethod,
                paymentStatus = initialPaymentStatus,
                orderStatus = initialOrderStatus,
                subtotal = subtotal,
                discountAmount = discountAmount,
                deliveryFee = deliveryFee,
                totalAmount = totalAmount
            )

            if (isCod) {
                addNotification(
                    uid = uid,
                    title = "Order $orderNum Confirmed",
                    body = "Your Cash on Delivery order ($itemsSummary) is confirmed and preparing for dispatch.",
                    category = "ORDER"
                )
            }
            Result.success(created)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun completeSandboxPayment(
        userId: String,
        orderId: String,
        outcome: String, // "PAID_SANDBOX", "FAILED", "CANCELLED"
        paymentMethod: String
    ): Result<String> {
        val docId = sanitizeId(orderId)
        val path = "users/$userId/orders/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val txRef = "${paymentMethod.uppercase().replace(" ", "")}-SBX-${UUID.randomUUID().toString().take(8).uppercase()}"
            val newOrderStatus = if (outcome == "PAID_SANDBOX") "Confirmed" else "Pending"
            val trackingCode = if (outcome == "PAID_SANDBOX") "MYX-${(10000..99999).random()}" else ""

            db.collection("users").document(uid).collection("orders").document(docId)
                .update(
                    mapOf(
                        "paymentStatus" to outcome,
                        "orderStatus" to newOrderStatus,
                        "transactionRef" to txRef,
                        "trackingCode" to trackingCode,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()

            val notifTitle = when (outcome) {
                "PAID_SANDBOX" -> "Sandbox Payment Verified ($txRef)"
                "FAILED" -> "Payment Verification Failed"
                else -> "Payment Cancelled"
            }
            val notifBody = when (outcome) {
                "PAID_SANDBOX" -> "Paid via $paymentMethod (Sandbox). Tracking: $trackingCode"
                "FAILED" -> "Payment via $paymentMethod failed in sandbox test. You can retry from My Orders."
                else -> "Payment was cancelled before completion. Order remains pending."
            }
            addNotification(uid, notifTitle, notifBody, "PAYMENT")
            Result.success(txRef)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun cancelOrder(userId: String, order: OrderRecord): Result<Unit> {
        val docId = sanitizeId(order.id)
        val path = "users/$userId/orders/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val nextPaymentStatus = if (order.paymentStatus == "PAID_SANDBOX") "REFUNDED" else "CANCELLED"
            db.collection("users").document(uid).collection("orders").document(docId)
                .update(
                    mapOf(
                        "orderStatus" to "Cancelled",
                        "paymentStatus" to nextPaymentStatus,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            addNotification(uid, "Order ${order.orderNumber} Cancelled", "Your cancellation has been processed.", "ORDER")
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    suspend fun updateOrderStatus(userId: String, orderId: String, newStatus: String, trackingCode: String = ""): Result<Unit> {
        val docId = sanitizeId(orderId)
        val path = "users/$userId/orders/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            val updates = mutableMapOf<String, Any>(
                "orderStatus" to newStatus,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            if (trackingCode.isNotBlank()) updates["trackingCode"] = trackingCode.take(80)
            db.collection("users").document(uid).collection("orders").document(docId).update(updates).await()
            addNotification(uid, "Order Update: $newStatus", "Your order status changed to $newStatus.", "SHIPPING")
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    // --- REWARDS ---
    fun observeRewards(userId: String): Flow<List<RewardRecord>> =
        db.collection("users").document(userId).collection("rewards")
            .snapshots()
            .map { snap -> snap.toObjects(RewardRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun addReward(
        userId: String,
        title: String,
        couponCode: String,
        discountType: String,
        discountValue: Double,
        minSpend: Double,
        source: String
    ): Result<Unit> {
        val docId = "rew_${System.currentTimeMillis()}_${(100..999).random()}"
        val path = "users/$userId/rewards/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("rewards").document(docId)
                .set(
                    mapOf(
                        "userId" to uid,
                        "title" to title.take(120),
                        "couponCode" to couponCode.take(40),
                        "discountType" to discountType,
                        "discountValue" to discountValue,
                        "minSpend" to minSpend,
                        "source" to source.take(50),
                        "redeemed" to false,
                        "expiresLabel" to "Valid 7 days",
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    // --- SHARED ADMIN-MANAGED COUPONS (READ-ONLY FOR USER PANEL) ---
    fun observeAdminCoupons(): Flow<List<CouponRule>> =
        db.collection("catalog_coupons")
            .snapshots()
            .map { snap ->
                snap.documents.mapNotNull { doc ->
                    val code = doc.getString("code")?.takeIf { it.isNotBlank() } ?: doc.id
                    val title = doc.getString("title") ?: return@mapNotNull null
                    val type = doc.getString("discountType") ?: "PERCENT"
                    val value = (doc.get("value") as? Number)?.toDouble() ?: 0.0
                    val minSpend = (doc.get("minSpend") as? Number)?.toDouble() ?: 0.0
                    val expires = doc.getString("expiresLabel") ?: "Limited Offer"
                    CouponRule(code, title, type, value, minSpend, expires)
                }
            }

    fun observeSiteConfig(): Flow<Pair<String, String>?> =
        db.collection("site_config").document("main")
            .snapshots()
            .map { snap ->
                if (!snap.exists()) null
                else {
                    val active = snap.getBoolean("announcementActive") ?: false
                    val text = snap.getString("announcementText").orEmpty()
                    val siteName = snap.getString("siteName").orEmpty().ifBlank { "MY Shop" }
                    if (active && text.isNotBlank()) siteName to text else null
                }
            }

    fun observeActivePopups(): Flow<List<Pair<String, String>>> =
        db.collection("popup_notices")
            .snapshots()
            .map { snap ->
                snap.documents.mapNotNull { doc ->
                    val active = doc.getBoolean("active") ?: false
                    val title = doc.getString("title").orEmpty()
                    val desc = doc.getString("description").orEmpty()
                    if (active && title.isNotBlank()) title to desc else null
                }
            }

    // --- NOTIFICATIONS ---
    fun observeNotifications(userId: String): Flow<List<NotificationRecord>> =
        db.collection("users").document(userId).collection("notifications")
            .snapshots()
            .map { snap ->
                snap.toObjects(NotificationRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: com.google.firebase.Timestamp(0, 0) }
            }

    suspend fun addNotification(uid: String, title: String, body: String, category: String): Result<Unit> {
        val docId = "notif_${System.currentTimeMillis()}_${(10..99).random()}"
        val path = "users/$uid/notifications/$docId"
        return try {
            val currentUid = requireUid()
            check(currentUid == uid)
            db.collection("users").document(uid).collection("notifications").document(docId)
                .set(
                    mapOf(
                        "userId" to uid,
                        "title" to title.take(120),
                        "body" to body.take(500),
                        "category" to category,
                        "read" to false,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    suspend fun markNotificationRead(userId: String, notificationId: String): Result<Unit> {
        val docId = sanitizeId(notificationId)
        val path = "users/$userId/notifications/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("notifications").document(docId)
                .update(mapOf("read" to true, "updatedAt" to FieldValue.serverTimestamp()))
                .await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, path)
            Result.failure(e)
        }
    }

    // --- SUPPORT TICKETS ---
    fun observeSupportTickets(userId: String): Flow<List<SupportTicketRecord>> =
        db.collection("users").document(userId).collection("support_tickets")
            .snapshots()
            .map { snap ->
                snap.toObjects(SupportTicketRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE)
                    .sortedByDescending { it.createdAt ?: com.google.firebase.Timestamp(0, 0) }
            }

    suspend fun createSupportTicket(
        userId: String,
        subject: String,
        orderId: String,
        category: String,
        message: String
    ): Result<Unit> {
        val docId = "tkt_${System.currentTimeMillis()}"
        val path = "users/$userId/support_tickets/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("support_tickets").document(docId)
                .set(
                    mapOf(
                        "userId" to uid,
                        "subject" to subject.trim().take(120),
                        "orderId" to orderId.trim().take(64),
                        "category" to category.trim().take(40),
                        "message" to message.trim().take(1000),
                        "status" to "Open",
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            addNotification(uid, "Support Ticket Opened", "Ticket '$subject' received. Our team responds within 2 hours.", "SUPPORT")
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }

    // --- PRODUCT REVIEWS ---
    fun observeUserReviews(userId: String): Flow<List<UserReviewRecord>> =
        db.collection("users").document(userId).collection("reviews")
            .snapshots()
            .map { snap -> snap.toObjects(UserReviewRecord::class.java, DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) }

    suspend fun submitReview(
        userId: String,
        productId: String,
        authorName: String,
        rating: Int,
        comment: String
    ): Result<Unit> {
        val docId = "rev_${sanitizeId(productId)}_${System.currentTimeMillis()}"
        val path = "users/$userId/reviews/$docId"
        return try {
            val uid = requireUid()
            check(uid == userId)
            db.collection("users").document(uid).collection("reviews").document(docId)
                .set(
                    mapOf(
                        "userId" to uid,
                        "productId" to productId.take(64),
                        "authorName" to authorName.trim().take(80).ifBlank { "MY Shop Customer" },
                        "rating" to rating.coerceIn(1, 5).toLong(),
                        "comment" to comment.trim().take(800),
                        "verifiedPurchase" to true,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, path)
            Result.failure(e)
        }
    }
}
