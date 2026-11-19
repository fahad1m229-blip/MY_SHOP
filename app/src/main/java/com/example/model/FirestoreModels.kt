package com.example.model

import androidx.annotation.Keep
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

@Keep
@IgnoreExtraProperties
data class UserProfile(
    @DocumentId val id: String = "",
    val userId: String = "",
    val displayName: String = "",
    val email: String = "",
    val phone: String = "",
    val photoUrl: String = "",
    val language: String = "EN",
    val darkMode: Boolean = true,
    val points: Long = 150L,
    val walletBalance: Double = 0.0,
    val streakCount: Long = 1L,
    val lastCheckInDate: String = "",
    val marketingOptIn: Boolean = true,
    val orderAlertsOptIn: Boolean = true,
    val priceDropOptIn: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class SavedAddress(
    @DocumentId val id: String = "",
    val userId: String = "",
    val label: String = "Home",
    val recipientName: String = "",
    val phone: String = "",
    val street: String = "",
    val city: String = "Dhaka",
    val postalCode: String = "",
    val country: String = "Bangladesh",
    val defaultAddress: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class CartItemRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val productId: String = "",
    val productName: String = "",
    val unitPrice: Double = 0.0,
    val quantity: Long = 1L,
    val selectedColor: String = "",
    val selectedSize: String = "",
    val savedForLater: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class WishlistRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val productId: String = "",
    val productName: String = "",
    val priceAlertEnabled: Boolean = false,
    val stockAlertEnabled: Boolean = false,
    val targetPrice: Double = 0.0,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class OrderLineItem(
    val productId: String = "",
    val name: String = "",
    val qty: Long = 1L,
    val price: Double = 0.0,
    val color: String = "",
    val size: String = ""
)

@Keep
@IgnoreExtraProperties
data class OrderRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val orderNumber: String = "",
    val idempotencyKey: String = "",
    val itemsSummary: String = "",
    val itemCount: Long = 1L,
    val items: List<OrderLineItem> = emptyList(),
    val shippingAddress: String = "",
    val paymentMethod: String = "bKash",
    val paymentStatus: String = "PENDING",
    val orderStatus: String = "Pending",
    val transactionRef: String = "",
    val trackingCode: String = "",
    val couponCode: String = "",
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val totalAmount: Double = 0.0,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class RewardRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val title: String = "",
    val couponCode: String = "",
    val discountType: String = "PERCENT",
    val discountValue: Double = 0.0,
    val minSpend: Double = 0.0,
    val source: String = "Spin & Win",
    val redeemed: Boolean = false,
    val expiresLabel: String = "Valid 7 days",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class NotificationRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val title: String = "",
    val body: String = "",
    val category: String = "ORDER",
    val read: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class SupportTicketRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val subject: String = "",
    val orderId: String = "",
    val category: String = "Order",
    val message: String = "",
    val status: String = "Open",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@Keep
@IgnoreExtraProperties
data class UserReviewRecord(
    @DocumentId val id: String = "",
    val userId: String = "",
    val productId: String = "",
    val authorName: String = "",
    val rating: Long = 5L,
    val comment: String = "",
    val verifiedPurchase: Boolean = true,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)
