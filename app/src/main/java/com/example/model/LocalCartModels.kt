package com.example.model

data class CartLineItem(
    val key: String,
    val productId: String,
    val productName: String,
    val unitPrice: Double,
    val originalPrice: Double,
    val quantity: Int,
    val selectedColor: String,
    val selectedSize: String,
    val freeDelivery: Boolean,
    val savedForLater: Boolean = false
)

enum class PaymentRegion(val label: String) {
    BANGLADESH("Bangladesh"),
    INTERNATIONAL("International")
}

data class PaymentMethodOption(
    val id: String,
    val displayName: String,
    val subtitle: String,
    val region: PaymentRegion,
    val supportsSandboxGateway: Boolean = true
)

enum class CheckoutStep {
    ADDRESS,
    PAYMENT,
    REVIEW,
    GATEWAY
}

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}
