package com.example.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.CatalogRepository
import com.example.data.GuestPreferencesStore
import com.example.data.LocalAppPrefs
import com.example.data.MyShopFirestoreRepository
import com.example.data.MyShopStorageRepository
import com.example.i18n.AppLanguage
import com.example.model.*
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class FilterState(
    val query: String = "",
    val selectedCategory: CategoryId? = null,
    val selectedBrand: String? = null,
    val maxPrice: Double = 140000.0,
    val minRating: Double = 0.0,
    val freeDeliveryOnly: Boolean = false,
    val sortOption: SortOption = SortOption.POPULAR
)

data class CheckoutDraft(
    val step: CheckoutStep = CheckoutStep.ADDRESS,
    val selectedAddressText: String = "",
    val selectedPaymentMethod: PaymentMethodOption = CatalogRepository.paymentMethods.first(),
    val pendingOrder: OrderRecord? = null,
    val idempotencyKey: String = UUID.randomUUID().toString(),
    val isProcessing: Boolean = false,
    val gatewayMessage: String? = null
)

class ShopViewModel(
    private val firestoreRepo: MyShopFirestoreRepository,
    private val prefsStore: GuestPreferencesStore,
    private val storageRepo: MyShopStorageRepository = MyShopStorageRepository()
) : ViewModel() {

    private val _currentUser = MutableStateFlow<FirebaseUser?>(null)
    val currentUser: StateFlow<FirebaseUser?> = _currentUser.asStateFlow()

    val localPrefs: StateFlow<LocalAppPrefs> = prefsStore.prefsFlow.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = LocalAppPrefs()
    )

    private val _filterState = MutableStateFlow(FilterState())
    val filterState: StateFlow<FilterState> = _filterState.asStateFlow()

    private val _appliedCouponCode = MutableStateFlow<String?>(null)
    val appliedCouponCode: StateFlow<String?> = _appliedCouponCode.asStateFlow()

    private val _checkoutDraft = MutableStateFlow(CheckoutDraft())
    val checkoutDraft: StateFlow<CheckoutDraft> = _checkoutDraft.asStateFlow()

    private val _flashCountdownSeconds = MutableStateFlow(5 * 3600L + 42 * 60L + 19L)
    val flashCountdownSeconds: StateFlow<Long> = _flashCountdownSeconds.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    private val _showAuthPrompt = MutableStateFlow<String?>(null)
    val showAuthPrompt: StateFlow<String?> = _showAuthPrompt.asStateFlow()

    // Authenticated Firestore Streams
    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile.asStateFlow()

    private val _addresses = MutableStateFlow<List<SavedAddress>>(emptyList())
    val addresses: StateFlow<List<SavedAddress>> = _addresses.asStateFlow()

    private val _cloudCart = MutableStateFlow<List<CartItemRecord>>(emptyList())
    private val _cloudWishlist = MutableStateFlow<List<WishlistRecord>>(emptyList())

    private val _orders = MutableStateFlow<List<OrderRecord>>(emptyList())
    val orders: StateFlow<List<OrderRecord>> = _orders.asStateFlow()

    private val _rewards = MutableStateFlow<List<RewardRecord>>(emptyList())
    val rewards: StateFlow<List<RewardRecord>> = _rewards.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationRecord>>(emptyList())
    val notifications: StateFlow<List<NotificationRecord>> = _notifications.asStateFlow()

    private val _supportTickets = MutableStateFlow<List<SupportTicketRecord>>(emptyList())
    val supportTickets: StateFlow<List<SupportTicketRecord>> = _supportTickets.asStateFlow()

    private val _userReviews = MutableStateFlow<List<UserReviewRecord>>(emptyList())
    val userReviews: StateFlow<List<UserReviewRecord>> = _userReviews.asStateFlow()

    private val _adminCoupons = MutableStateFlow<List<CouponRule>>(emptyList())

    private val _adminAnnouncement = MutableStateFlow<Pair<String, String>?>(null)
    val adminAnnouncement: StateFlow<Pair<String, String>?> = _adminAnnouncement.asStateFlow()

    private val _announcementSettings = MutableStateFlow<AnnouncementSettings?>(null)
    val announcementSettings: StateFlow<AnnouncementSettings?> = _announcementSettings.asStateFlow()

    private val _socialSupportSettings = MutableStateFlow(SocialSupportSettings())
    val socialSupportSettings: StateFlow<SocialSupportSettings> = _socialSupportSettings.asStateFlow()

    private val _allPopups = MutableStateFlow<List<PopupNoticeConfig>>(emptyList())
    private val _hasLoadedPopups = MutableStateFlow(false)
    private val _activeWelcomePopup = MutableStateFlow<PopupNoticeConfig?>(null)
    val activeWelcomePopup: StateFlow<PopupNoticeConfig?> = _activeWelcomePopup.asStateFlow()

    private val _activePopups = MutableStateFlow<List<Pair<String, String>>>(emptyList())
    val activePopups: StateFlow<List<Pair<String, String>>> = _activePopups.asStateFlow()

    private val shownPopupIdsThisSession = mutableSetOf<String>()
    private val impressionRecordedIds = mutableSetOf<String>()
    private var popupTriggerJob: Job? = null

    private val _isUploadingAvatar = MutableStateFlow(false)
    val isUploadingAvatar: StateFlow<Boolean> = _isUploadingAvatar.asStateFlow()

    // Local session Q&A additions
    private val _sessionQa = MutableStateFlow<Map<String, List<ProductQA>>>(emptyMap())
    val sessionQa: StateFlow<Map<String, List<ProductQA>>> = _sessionQa.asStateFlow()

    // Local laugh reactions in Funny Zone
    private val _funnyUpvotedIds = MutableStateFlow<Set<String>>(emptySet())
    val funnyUpvotedIds: StateFlow<Set<String>> = _funnyUpvotedIds.asStateFlow()

    private var authCollectorJob: Job? = null

    init {
        viewModelScope.launch {
            while (true) {
                delay(1000L)
                _flashCountdownSeconds.update { if (it > 0) it - 1 else 5 * 3600L }
            }
        }

        // Public shared CMS streams (always active for Guests & Signed-In customers)
        viewModelScope.launch {
            firestoreRepo.observeAdminCoupons()
                .catch { Log.w("ShopViewModel", "Coupons stream: ${it.message}") }
                .collect { _adminCoupons.value = it }
        }
        viewModelScope.launch {
            firestoreRepo.observeSiteConfig()
                .catch { Log.w("ShopViewModel", "SiteConfig stream: ${it.message}") }
                .collect { _adminAnnouncement.value = it }
        }
        viewModelScope.launch {
            firestoreRepo.observeAnnouncementSettings()
                .catch { Log.w("ShopViewModel", "Announcements stream: ${it.message}") }
                .collect { _announcementSettings.value = it }
        }
        viewModelScope.launch {
            firestoreRepo.observeSocialSupportSettings()
                .catch { Log.w("ShopViewModel", "SocialSupport stream: ${it.message}") }
                .collect { _socialSupportSettings.value = it }
        }
        viewModelScope.launch {
            firestoreRepo.observePopupNotices()
                .catch {
                    Log.w("ShopViewModel", "PopupNotices stream: ${it.message}")
                    _hasLoadedPopups.value = true
                }
                .collect { notices ->
                    _allPopups.value = notices
                    _activePopups.value = notices.filter { it.active }.map { it.title to it.description }
                    _hasLoadedPopups.value = true
                }
        }
        viewModelScope.launch {
            combine(_hasLoadedPopups, _allPopups, localPrefs) { loaded, notices, prefs ->
                Triple(loaded, notices, prefs)
            }.collect { (loaded, notices, prefs) ->
                if (!loaded || _activeWelcomePopup.value != null) return@collect
                evaluatePopupEligibility(notices, prefs)
            }
        }
    }

    val filteredProducts: StateFlow<List<Product>> = _filterState.map { filter ->
        val q = filter.query.trim().lowercase()
        val list = CatalogRepository.products.filter { p ->
            val matchesQuery = q.isEmpty() ||
                p.name.lowercase().contains(q) ||
                p.nameBn.lowercase().contains(q) ||
                p.brand.lowercase().contains(q) ||
                p.category.titleEn.lowercase().contains(q) ||
                p.description.lowercase().contains(q)
            val matchesCategory = filter.selectedCategory == null || p.category == filter.selectedCategory
            val matchesBrand = filter.selectedBrand == null || p.brand.equals(filter.selectedBrand, ignoreCase = true)
            val matchesPrice = p.price <= filter.maxPrice
            val matchesRating = p.rating >= filter.minRating
            val matchesDelivery = !filter.freeDeliveryOnly || p.freeDelivery
            matchesQuery && matchesCategory && matchesBrand && matchesPrice && matchesRating && matchesDelivery
        }
        when (filter.sortOption) {
            SortOption.POPULAR -> list.sortedByDescending { (if (it.trending) 500 else 0) + it.reviewCount }
            SortOption.PRICE_LOW -> list.sortedBy { it.price }
            SortOption.PRICE_HIGH -> list.sortedByDescending { it.price }
            SortOption.NEWEST -> list.sortedByDescending { if (it.newArrival) 1 else 0 }
            SortOption.TOP_RATED -> list.sortedByDescending { it.rating }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), CatalogRepository.products)

    val cartItems: StateFlow<List<CartLineItem>> = combine(_currentUser, _cloudCart, localPrefs) { user, cloud, prefs ->
        if (user != null) {
            cloud.mapNotNull { rec ->
                val prod = CatalogRepository.findProduct(rec.productId)
                CartLineItem(
                    key = rec.id,
                    productId = rec.productId,
                    productName = rec.productName,
                    unitPrice = prod?.price ?: rec.unitPrice,
                    originalPrice = prod?.originalPrice ?: rec.unitPrice,
                    quantity = rec.quantity.toInt().coerceIn(1, 99),
                    selectedColor = rec.selectedColor,
                    selectedSize = rec.selectedSize,
                    freeDelivery = prod?.freeDelivery ?: false,
                    savedForLater = rec.savedForLater
                )
            }
        } else {
            prefs.guestCart
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val activeCartItems: StateFlow<List<CartLineItem>> = cartItems.map { items ->
        items.filter { !it.savedForLater }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val savedForLaterItems: StateFlow<List<CartLineItem>> = cartItems.map { items ->
        items.filter { it.savedForLater }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val wishlistProductIds: StateFlow<Set<String>> = combine(_currentUser, _cloudWishlist, localPrefs) { user, cloud, prefs ->
        if (user != null) cloud.map { it.productId }.toSet() else prefs.guestWishlistIds
    }.stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    val cartBadgeCount: StateFlow<Int> = activeCartItems.map { items ->
        items.sumOf { it.quantity }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, 0)

    val activePoints: StateFlow<Int> = combine(_currentUser, _userProfile, localPrefs) { user, profile, prefs ->
        if (user != null && profile != null) profile.points.toInt() else prefs.guestPoints
    }.stateIn(viewModelScope, SharingStarted.Eagerly, 100)

    fun onAuthStateChanged(user: FirebaseUser?) {
        val previousUid = _currentUser.value?.uid
        _currentUser.value = user
        if (user == null) {
            authCollectorJob?.cancel()
            authCollectorJob = null
            _userProfile.value = null
            _addresses.value = emptyList()
            _cloudCart.value = emptyList()
            _cloudWishlist.value = emptyList()
            _orders.value = emptyList()
            _rewards.value = emptyList()
            _notifications.value = emptyList()
            _supportTickets.value = emptyList()
            _userReviews.value = emptyList()
            return
        }
        if (previousUid == user.uid && authCollectorJob?.isActive == true) return
        _showAuthPrompt.value = null

        authCollectorJob?.cancel()
        authCollectorJob = viewModelScope.launch {
            val prefs = localPrefs.value
            firestoreRepo.ensureUserProfile(user, prefs.language.code, prefs.darkMode)

            // Preserve guest cart after Google Sign-In
            if (prefs.guestCart.isNotEmpty()) {
                firestoreRepo.mergeGuestCart(user.uid, prefs.guestCart)
                prefsStore.clearGuestCart()
                showMessage("Your ${prefs.guestCart.sumOf { it.quantity }} guest cart item(s) have been synced to your account!")
            }

            // Preserve guest wishlist items
            if (prefs.guestWishlistIds.isNotEmpty()) {
                prefs.guestWishlistIds.forEach { pid ->
                    CatalogRepository.findProduct(pid)?.let { prod ->
                        firestoreRepo.saveWishlistItem(user.uid, prod)
                    }
                }
            }

            launch {
                firestoreRepo.observeUserProfile(user.uid)
                    .catch { handleStreamError("profile", it) }
                    .collect { _userProfile.value = it }
            }
            launch {
                firestoreRepo.observeAddresses(user.uid)
                    .catch { handleStreamError("addresses", it) }
                    .collect { list ->
                        _addresses.value = list
                        if (_checkoutDraft.value.selectedAddressText.isBlank() && list.isNotEmpty()) {
                            val def = list.firstOrNull { it.defaultAddress } ?: list.first()
                            _checkoutDraft.update {
                                it.copy(selectedAddressText = "${def.recipientName}, ${def.phone} — ${def.street}, ${def.city}, ${def.country}")
                            }
                        }
                    }
            }
            launch {
                firestoreRepo.observeCart(user.uid)
                    .catch { handleStreamError("cart", it) }
                    .collect { _cloudCart.value = it }
            }
            launch {
                firestoreRepo.observeWishlist(user.uid)
                    .catch { handleStreamError("wishlist", it) }
                    .collect { _cloudWishlist.value = it }
            }
            launch {
                firestoreRepo.observeOrders(user.uid)
                    .catch { handleStreamError("orders", it) }
                    .collect { _orders.value = it }
            }
            launch {
                firestoreRepo.observeRewards(user.uid)
                    .catch { handleStreamError("rewards", it) }
                    .collect { _rewards.value = it }
            }
            launch {
                firestoreRepo.observeNotifications(user.uid)
                    .catch { handleStreamError("notifications", it) }
                    .collect { _notifications.value = it }
            }
            launch {
                firestoreRepo.observeSupportTickets(user.uid)
                    .catch { handleStreamError("tickets", it) }
                    .collect { _supportTickets.value = it }
            }
            launch {
                firestoreRepo.observeUserReviews(user.uid)
                    .catch { handleStreamError("reviews", it) }
                    .collect { _userReviews.value = it }
            }
        }
    }

    private fun handleStreamError(streamName: String, error: Throwable) {
        val firestoreError = generateSequence(error) { it.cause }
            .filterIsInstance<FirebaseFirestoreException>()
            .firstOrNull()
        if (firestoreError == null && error is CancellationException) throw error
        if (_currentUser.value != null) {
            val root = firestoreError ?: error
            Log.w("ShopViewModel", "Error observing $streamName: ${root.message}", root)
        }
    }

    // --- UI & PREFERENCES ---
    fun toggleLanguage() {
        viewModelScope.launch {
            val next = if (localPrefs.value.language == AppLanguage.EN) AppLanguage.BN else AppLanguage.EN
            prefsStore.setLanguage(next)
            _currentUser.value?.uid?.let { uid ->
                firestoreRepo.updateProfileFields(uid, mapOf("language" to next.code))
            }
        }
    }

    fun toggleDarkMode() {
        viewModelScope.launch {
            val next = !localPrefs.value.darkMode
            prefsStore.setDarkMode(next)
            _currentUser.value?.uid?.let { uid ->
                firestoreRepo.updateProfileFields(uid, mapOf("darkMode" to next))
            }
        }
    }

    fun uploadProfileAvatar(context: Context, imageUri: Uri) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            _isUploadingAvatar.value = true
            storageRepo.uploadProfileAvatar(context, imageUri)
                .onSuccess { downloadUrl ->
                    firestoreRepo.updateProfileFields(user.uid, mapOf("photoUrl" to downloadUrl))
                    showMessage("Profile photo uploaded to Firebase Storage!")
                }
                .onFailure { err ->
                    showMessage(err.localizedMessage ?: "Storage upload failed. Ensure Firebase Storage is enabled in Firebase Console.")
                }
            _isUploadingAvatar.value = false
        }
    }

    fun showMessage(msg: String) {
        _snackbarMessage.value = msg
    }

    fun clearMessage() {
        _snackbarMessage.value = null
    }

    fun requestAuth(reason: String) {
        _showAuthPrompt.value = reason
    }

    fun dismissAuthPrompt() {
        _showAuthPrompt.value = null
    }

    // --- SOCIAL SUPPORT & 3D WELCOME POPUP ---
    private fun evaluatePopupEligibility(notices: List<PopupNoticeConfig>, prefs: LocalAppPrefs) {
        val candidates = if (notices.isEmpty()) listOf(PopupNoticeConfig()) else notices
        val today = todayKey()
        val now = System.currentTimeMillis()
        val eligible = candidates.firstOrNull { popup ->
            if (!popup.active) return@firstOrNull false
            if (popup.targetAudience == "NEW_VISITORS" && prefs.hasVisitedBefore) return@firstOrNull false
            if (popup.startDate.isNotBlank() && today < popup.startDate) return@firstOrNull false
            if (popup.endDate.isNotBlank() && today > popup.endDate) return@firstOrNull false
            if (shownPopupIdsThisSession.contains(popup.id)) return@firstOrNull false

            val lastDismissed = prefs.popupDismissals[popup.id] ?: 0L
            when (popup.frequency) {
                "EVERY_VISIT" -> true
                "ONCE_PER_SESSION" -> !shownPopupIdsThisSession.contains(popup.id)
                "ONCE_PER_DAY" -> now - lastDismissed >= 24L * 60L * 60L * 1000L
                "ONCE_PER_WEEK" -> now - lastDismissed >= 7L * 24L * 60L * 60L * 1000L
                "ONCE_PER_USER" -> lastDismissed == 0L
                else -> true
            }
        } ?: return

        if (popupTriggerJob?.isActive == true) return
        popupTriggerJob = viewModelScope.launch {
            val waitMs = (eligible.delaySeconds.coerceIn(0, 30)) * 1000L
            if (waitMs > 0) delay(waitMs)
            if (_activeWelcomePopup.value != null) return@launch
            shownPopupIdsThisSession.add(eligible.id)
            _activeWelcomePopup.value = eligible
            if (impressionRecordedIds.add(eligible.id)) {
                firestoreRepo.incrementAnalyticsCounter("popupImpressions")
            }
            if (eligible.durationSeconds > 0) {
                delay(eligible.durationSeconds * 1000L)
                if (_activeWelcomePopup.value?.id == eligible.id) {
                    dismissWelcomePopup(eligible.id, recordCloseAnalytics = false)
                }
            }
        }
    }

    fun dismissWelcomePopup(popupId: String, recordCloseAnalytics: Boolean = true) {
        shownPopupIdsThisSession.add(popupId)
        _activeWelcomePopup.value = null
        viewModelScope.launch {
            prefsStore.recordPopupDismissal(popupId, System.currentTimeMillis())
            if (recordCloseAnalytics) {
                firestoreRepo.incrementAnalyticsCounter("popupCloses")
            }
        }
    }

    fun trackSocialPlatformClick(platformId: String) {
        val field = when (platformId.lowercase()) {
            "facebook" -> "fbClicks"
            "youtube" -> "ytClicks"
            "tiktok" -> "ttClicks"
            "telegram" -> "tgClicks"
            else -> return
        }
        viewModelScope.launch {
            firestoreRepo.incrementAnalyticsCounter(field)
        }
    }

    // --- SEARCH & FILTERING ---
    fun updateSearchQuery(query: String) {
        _filterState.update { it.copy(query = query) }
    }

    fun selectCategory(category: CategoryId?) {
        _filterState.update { it.copy(selectedCategory = category) }
        if (category != null) {
            viewModelScope.launch { prefsStore.trackCategoryExplore(category.name) }
        }
    }

    fun selectBrand(brand: String?) {
        _filterState.update { it.copy(selectedBrand = brand) }
    }

    fun updateFilters(
        maxPrice: Double = _filterState.value.maxPrice,
        minRating: Double = _filterState.value.minRating,
        freeDeliveryOnly: Boolean = _filterState.value.freeDeliveryOnly,
        sortOption: SortOption = _filterState.value.sortOption
    ) {
        _filterState.update {
            it.copy(
                maxPrice = maxPrice,
                minRating = minRating,
                freeDeliveryOnly = freeDeliveryOnly,
                sortOption = sortOption
            )
        }
    }

    fun resetFilters() {
        _filterState.value = FilterState()
    }

    fun markProductViewed(productId: String) {
        viewModelScope.launch {
            prefsStore.pushRecentlyViewed(productId)
            CatalogRepository.findProduct(productId)?.let { p ->
                prefsStore.trackCategoryExplore(p.category.name)
            }
        }
    }

    // --- COMPARISON (UP TO 4 PRODUCTS) ---
    fun toggleCompare(product: Product) {
        viewModelScope.launch {
            val current = localPrefs.value.compareIds.toMutableList()
            if (current.contains(product.id)) {
                current.remove(product.id)
                prefsStore.setCompareIds(current)
                showMessage("Removed ${product.name} from comparison")
            } else if (current.size >= 4) {
                showMessage("You can compare up to 4 products at a time.")
            } else {
                current.add(product.id)
                prefsStore.setCompareIds(current)
                showMessage("Added ${product.name} to Compare (${current.size}/4)")
            }
        }
    }

    fun removeCompare(productId: String) {
        viewModelScope.launch {
            val current = localPrefs.value.compareIds.toMutableList()
            current.remove(productId)
            prefsStore.setCompareIds(current)
        }
    }

    // --- CART (GUEST + CLOUD SYNC) ---
    fun addToCart(
        product: Product,
        color: String = product.colors.firstOrNull().orEmpty(),
        size: String = product.sizes.firstOrNull().orEmpty(),
        quantity: Int = 1
    ) {
        if (product.stock <= 0) {
            showMessage("${product.name} is currently out of stock.")
            return
        }
        val key = "${product.id}_${color}_${size}".replace(Regex("[^a-zA-Z0-9_]"), "_")
        viewModelScope.launch {
            val user = _currentUser.value
            val currentList = cartItems.value.toMutableList()
            val existingIdx = currentList.indexOfFirst { it.key == key }
            val updatedItem = if (existingIdx >= 0) {
                val existing = currentList[existingIdx]
                existing.copy(
                    quantity = (existing.quantity + quantity).coerceIn(1, 99),
                    savedForLater = false
                )
            } else {
                CartLineItem(
                    key = key,
                    productId = product.id,
                    productName = product.name,
                    unitPrice = product.price,
                    originalPrice = product.originalPrice,
                    quantity = quantity.coerceIn(1, 99),
                    selectedColor = color,
                    selectedSize = size,
                    freeDelivery = product.freeDelivery,
                    savedForLater = false
                )
            }
            if (user != null) {
                firestoreRepo.upsertCartItem(user.uid, updatedItem)
            } else {
                if (existingIdx >= 0) currentList[existingIdx] = updatedItem else currentList.add(updatedItem)
                prefsStore.saveGuestCart(currentList)
            }
            showMessage("Added ${product.name} to cart!")
        }
    }

    fun updateCartQuantity(item: CartLineItem, delta: Int) {
        val nextQty = item.quantity + delta
        if (nextQty <= 0) {
            removeFromCart(item)
            return
        }
        val updated = item.copy(quantity = nextQty.coerceIn(1, 99))
        viewModelScope.launch {
            val user = _currentUser.value
            if (user != null) {
                firestoreRepo.upsertCartItem(user.uid, updated)
            } else {
                val list = localPrefs.value.guestCart.map { if (it.key == item.key) updated else it }
                prefsStore.saveGuestCart(list)
            }
        }
    }

    fun toggleSaveForLater(item: CartLineItem) {
        val updated = item.copy(savedForLater = !item.savedForLater)
        viewModelScope.launch {
            val user = _currentUser.value
            if (user != null) {
                firestoreRepo.upsertCartItem(user.uid, updated)
            } else {
                val list = localPrefs.value.guestCart.map { if (it.key == item.key) updated else it }
                prefsStore.saveGuestCart(list)
            }
            showMessage(if (updated.savedForLater) "Saved for later" else "Moved back to cart")
        }
    }

    fun removeFromCart(item: CartLineItem) {
        viewModelScope.launch {
            val user = _currentUser.value
            if (user != null) {
                firestoreRepo.removeCartItem(user.uid, item.key)
            } else {
                val list = localPrefs.value.guestCart.filterNot { it.key == item.key }
                prefsStore.saveGuestCart(list)
            }
        }
    }

    // --- COUPONS & TOTALS ---
    fun availableCoupons(): List<CouponRule> {
        val wonCodes = localPrefs.value.guestWonCoupons.map { code ->
            when {
                code.startsWith("SPIN15") -> CouponRule(code, "Spin & Win 15% Off", "PERCENT", 15.0, 1200.0, "Valid 7 days")
                code.startsWith("SCRATCH100") -> CouponRule(code, "Scratch & Reveal ৳100 Off", "FIXED", 100.0, 800.0, "Valid 7 days")
                code.startsWith("HUNT") -> CouponRule(code, "Treasure Hunt ৳250 Off", "FIXED", 250.0, 1500.0, "Valid 7 days")
                else -> CouponRule(code, "Fun Zone Bonus 10% Off", "PERCENT", 10.0, 500.0, "Valid 7 days")
            }
        }
        val cloudCoupons = _rewards.value.filter { !it.redeemed && it.couponCode.isNotBlank() }.map {
            CouponRule(it.couponCode, it.title, it.discountType, it.discountValue, it.minSpend, it.expiresLabel)
        }
        return (CatalogRepository.builtInCoupons + _adminCoupons.value + wonCodes + cloudCoupons).distinctBy { it.code }
    }

    fun applyCoupon(code: String) {
        val clean = code.trim().uppercase()
        if (clean.isBlank()) {
            _appliedCouponCode.value = null
            return
        }
        val rule = availableCoupons().firstOrNull { it.code.equals(clean, ignoreCase = true) }
        if (rule == null) {
            showMessage("Coupon '$clean' not found. Try MYSHOP10 or FLASH200!")
            return
        }
        val subtotal = activeCartItems.value.sumOf { it.unitPrice * it.quantity }
        if (subtotal < rule.minSpend) {
            showMessage("Minimum spend ৳${rule.minSpend.toInt()} required for ${rule.code}.")
            return
        }
        _appliedCouponCode.value = rule.code
        showMessage("Coupon ${rule.code} applied!")
    }

    fun clearCoupon() {
        _appliedCouponCode.value = null
    }

    fun calculateTotals(items: List<CartLineItem>, couponCode: String?): Triple<Double, Double, Double> {
        val subtotal = items.sumOf { it.unitPrice * it.quantity }
        if (subtotal <= 0.0) return Triple(0.0, 0.0, 0.0)
        val rule = availableCoupons().firstOrNull { it.code.equals(couponCode, ignoreCase = true) }
        var discount = 0.0
        var freeDelByCoupon = false
        if (rule != null && subtotal >= rule.minSpend) {
            when (rule.discountType) {
                "PERCENT" -> discount = (subtotal * (rule.value / 100.0)).coerceAtMost(subtotal)
                "FIXED" -> discount = rule.value.coerceAtMost(subtotal)
                "FREE_DELIVERY" -> freeDelByCoupon = true
            }
        }
        val allItemsFreeDel = items.all { it.freeDelivery }
        val deliveryFee = if (allItemsFreeDel || subtotal >= 2000.0 || freeDelByCoupon) 0.0 else 80.0
        return Triple(subtotal, discount, deliveryFee)
    }

    // --- WISHLIST ---
    fun toggleWishlist(product: Product, requireAccount: Boolean = false) {
        val user = _currentUser.value
        if (user == null && requireAccount) {
            requestAuth("Sign in with Google to sync '${product.name}' and Price-Drop alerts to your account.")
            return
        }
        viewModelScope.launch {
            if (user != null) {
                val exists = _cloudWishlist.value.any { it.productId == product.id }
                if (exists) {
                    firestoreRepo.removeWishlistItem(user.uid, product.id)
                    showMessage("Removed from wishlist")
                } else {
                    firestoreRepo.saveWishlistItem(user.uid, product)
                    showMessage("Saved to wishlist with Price-Drop alerts!")
                }
            } else {
                val set = localPrefs.value.guestWishlistIds.toMutableSet()
                val added = if (set.contains(product.id)) {
                    set.remove(product.id); false
                } else {
                    set.add(product.id); true
                }
                prefsStore.setGuestWishlist(set)
                showMessage(if (added) "Saved to guest wishlist! Sign in anytime to sync." else "Removed from wishlist")
            }
        }
    }

    fun toggleWishlistAlerts(productId: String, priceAlert: Boolean, stockAlert: Boolean) {
        val user = _currentUser.value ?: return
        val prod = CatalogRepository.findProduct(productId) ?: return
        viewModelScope.launch {
            firestoreRepo.saveWishlistItem(user.uid, prod, priceAlert, stockAlert)
            showMessage("Alert preferences updated")
        }
    }

    // --- CHECKOUT & PAYMENTS ---
    fun startCheckout(onReady: () -> Unit) {
        val user = _currentUser.value
        if (user == null) {
            requestAuth("Sign in with Google to place your order. All ${cartBadgeCount.value} cart item(s) will be preserved!")
            return
        }
        if (activeCartItems.value.isEmpty()) {
            showMessage("Your cart is empty.")
            return
        }
        val defaultAddr = _addresses.value.firstOrNull { it.defaultAddress } ?: _addresses.value.firstOrNull()
        _checkoutDraft.value = CheckoutDraft(
            step = CheckoutStep.ADDRESS,
            selectedAddressText = defaultAddr?.let { "${it.recipientName}, ${it.phone} — ${it.street}, ${it.city}, ${it.country}" } ?: "",
            idempotencyKey = UUID.randomUUID().toString()
        )
        onReady()
    }

    fun setCheckoutStep(step: CheckoutStep) {
        _checkoutDraft.update { it.copy(step = step) }
    }

    fun selectCheckoutAddress(addressText: String) {
        _checkoutDraft.update { it.copy(selectedAddressText = addressText) }
    }

    fun selectPaymentMethod(method: PaymentMethodOption) {
        _checkoutDraft.update { it.copy(selectedPaymentMethod = method) }
    }

    fun saveAddress(label: String, name: String, phone: String, street: String, city: String, postalCode: String, country: String, isDefault: Boolean) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            val addr = SavedAddress(
                userId = user.uid,
                label = label,
                recipientName = name,
                phone = phone,
                street = street,
                city = city,
                postalCode = postalCode,
                country = country,
                defaultAddress = isDefault
            )
            firestoreRepo.saveAddress(user.uid, addr).onSuccess {
                _checkoutDraft.update {
                    it.copy(selectedAddressText = "$name, $phone — $street, $city, $country")
                }
                showMessage("Address saved!")
            }.onFailure {
                showMessage(it.localizedMessage ?: "Failed to save address")
            }
        }
    }

    fun deleteAddress(addressId: String) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            firestoreRepo.deleteAddress(user.uid, addressId)
        }
    }

    fun createPendingOrder(onCreated: (OrderRecord) -> Unit) {
        val user = _currentUser.value ?: return
        val items = activeCartItems.value
        val draft = _checkoutDraft.value
        if (items.isEmpty() || draft.selectedAddressText.length < 5) {
            showMessage("Please select or enter a valid delivery address.")
            return
        }
        val (subtotal, discount, deliveryFee) = calculateTotals(items, _appliedCouponCode.value)
        val total = (subtotal - discount + deliveryFee).coerceAtLeast(0.0)
        viewModelScope.launch {
            _checkoutDraft.update { it.copy(isProcessing = true, gatewayMessage = null) }
            val result = firestoreRepo.createOrder(
                userId = user.uid,
                items = items,
                shippingAddress = draft.selectedAddressText,
                paymentMethod = draft.selectedPaymentMethod.id,
                couponCode = _appliedCouponCode.value.orEmpty(),
                subtotal = subtotal,
                discountAmount = discount,
                deliveryFee = deliveryFee,
                totalAmount = total,
                idempotencyKey = draft.idempotencyKey
            )
            result.onSuccess { order ->
                if (!draft.selectedPaymentMethod.supportsSandboxGateway) {
                    // Cash on Delivery confirmed immediately
                    firestoreRepo.clearActiveCart(user.uid, items.map { it.key })
                    _appliedCouponCode.value = null
                    _checkoutDraft.update { it.copy(isProcessing = false, pendingOrder = order) }
                    onCreated(order)
                } else {
                    _checkoutDraft.update {
                        it.copy(
                            isProcessing = false,
                            pendingOrder = order,
                            step = CheckoutStep.GATEWAY
                        )
                    }
                }
            }.onFailure { err ->
                _checkoutDraft.update { it.copy(isProcessing = false) }
                showMessage(err.localizedMessage ?: "Failed to create order")
            }
        }
    }

    fun verifySandboxPayment(outcome: String, onFinished: (Boolean, String) -> Unit) {
        val user = _currentUser.value ?: return
        val order = _checkoutDraft.value.pendingOrder ?: return
        viewModelScope.launch {
            _checkoutDraft.update { it.copy(isProcessing = true) }
            val result = firestoreRepo.completeSandboxPayment(
                userId = user.uid,
                orderId = order.id,
                outcome = outcome,
                paymentMethod = order.paymentMethod
            )
            result.onSuccess { txRef ->
                if (outcome == "PAID_SANDBOX") {
                    firestoreRepo.clearActiveCart(user.uid, activeCartItems.value.map { it.key })
                    _appliedCouponCode.value = null
                    _checkoutDraft.update { it.copy(isProcessing = false, gatewayMessage = "Verified Ref: $txRef") }
                    onFinished(true, txRef)
                } else {
                    _checkoutDraft.update {
                        it.copy(
                            isProcessing = false,
                            gatewayMessage = "Sandbox Payment $outcome (Ref: $txRef). You can retry or pay from My Orders."
                        )
                    }
                    onFinished(false, txRef)
                }
            }.onFailure { err ->
                _checkoutDraft.update { it.copy(isProcessing = false) }
                showMessage(err.localizedMessage ?: "Gateway error")
            }
        }
    }

    fun retryOrderPayment(order: OrderRecord, onReady: () -> Unit) {
        _checkoutDraft.value = CheckoutDraft(
            step = CheckoutStep.GATEWAY,
            selectedAddressText = order.shippingAddress,
            selectedPaymentMethod = CatalogRepository.paymentMethods.firstOrNull { it.id == order.paymentMethod }
                ?: CatalogRepository.paymentMethods.first(),
            pendingOrder = order,
            idempotencyKey = order.idempotencyKey
        )
        onReady()
    }

    // --- ORDERS ACTIONS ---
    fun cancelOrder(order: OrderRecord) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            firestoreRepo.cancelOrder(user.uid, order).onSuccess {
                showMessage("Order ${order.orderNumber} cancelled")
            }.onFailure {
                showMessage(it.localizedMessage ?: "Unable to cancel order")
            }
        }
    }

    fun requestReturn(order: OrderRecord) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            firestoreRepo.updateOrderStatus(user.uid, order.id, "Return Requested").onSuccess {
                showMessage("Return requested for ${order.orderNumber}")
            }
        }
    }

    fun advanceTrackingStep(order: OrderRecord) {
        val user = _currentUser.value ?: return
        val next = when (order.orderStatus) {
            "Pending" -> "Confirmed"
            "Confirmed" -> "Processing"
            "Processing" -> "Shipped"
            "Shipped" -> "Out for Delivery"
            "Out for Delivery" -> "Delivered"
            else -> return
        }
        viewModelScope.launch {
            firestoreRepo.updateOrderStatus(
                user.uid,
                order.id,
                next,
                order.trackingCode.ifBlank { "MYX-${order.orderNumber.takeLast(5)}" }
            )
        }
    }

    fun reorderItems(order: OrderRecord) {
        order.items.forEach { item ->
            CatalogRepository.findProduct(item.productId)?.let { prod ->
                addToCart(prod, item.color, item.size, item.qty.toInt())
            }
        }
        showMessage("Added items from ${order.orderNumber} back to your cart!")
    }

    // --- REVIEWS & Q&A ---
    fun submitProductReview(productId: String, rating: Int, comment: String) {
        val user = _currentUser.value
        if (user == null) {
            requestAuth("Sign in with Google to submit a verified customer review.")
            return
        }
        if (comment.trim().length < 3) {
            showMessage("Please write at least 3 characters for your review.")
            return
        }
        viewModelScope.launch {
            val author = _userProfile.value?.displayName ?: user.displayName ?: "MY Shop Customer"
            firestoreRepo.submitReview(user.uid, productId, author, rating, comment)
                .onSuccess { showMessage("Thank you! Your review has been published.") }
                .onFailure { showMessage(it.localizedMessage ?: "Failed to publish review") }
        }
    }

    fun askProductQuestion(productId: String, question: String) {
        val clean = question.trim()
        if (clean.length < 4) return
        val author = _userProfile.value?.displayName ?: _currentUser.value?.displayName ?: "Guest Shopper"
        val newQa = ProductQA(
            id = "qa_${System.currentTimeMillis()}",
            question = clean,
            answer = "Seller notified! Typical response time is under 3 hours.",
            askedBy = author
        )
        _sessionQa.update { current ->
            val updatedList = (current[productId] ?: emptyList()) + newQa
            current + (productId to updatedList)
        }
        showMessage("Question posted!")
    }

    // --- NOTIFICATIONS & SUPPORT ---
    fun markNotificationRead(id: String) {
        val user = _currentUser.value ?: return
        viewModelScope.launch { firestoreRepo.markNotificationRead(user.uid, id) }
    }

    fun updateNotificationPrefs(marketing: Boolean, orderAlerts: Boolean, priceDrop: Boolean) {
        val user = _currentUser.value ?: return
        viewModelScope.launch {
            firestoreRepo.updateProfileFields(
                user.uid,
                mapOf(
                    "marketingOptIn" to marketing,
                    "orderAlertsOptIn" to orderAlerts,
                    "priceDropOptIn" to priceDrop
                )
            )
        }
    }

    fun createSupportTicket(subject: String, orderId: String, category: String, message: String) {
        val user = _currentUser.value
        if (user == null) {
            requestAuth("Sign in with Google to open and track support tickets.")
            return
        }
        if (subject.trim().length < 3 || message.trim().length < 5) {
            showMessage("Please enter a valid subject and description.")
            return
        }
        viewModelScope.launch {
            firestoreRepo.createSupportTicket(user.uid, subject, orderId, category, message)
                .onSuccess { showMessage("Support ticket created!") }
                .onFailure { showMessage(it.localizedMessage ?: "Failed to submit ticket") }
        }
    }

    // --- FUN ZONE ---
    private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    fun canSpinToday(): Boolean = localPrefs.value.lastSpinDate != todayKey()
    fun canScratchToday(): Boolean = localPrefs.value.lastScratchDate != todayKey()
    fun canClaimStreakToday(): Boolean = localPrefs.value.lastStreakDate != todayKey()

    fun completeDailySpin(label: String, bonusPoints: Int, couponCode: String?) {
        val today = todayKey()
        viewModelScope.launch {
            prefsStore.recordSpin(today, bonusPoints, couponCode)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(uid, mapOf("points" to curPts + bonusPoints))
                if (!couponCode.isNullOrBlank()) {
                    firestoreRepo.addReward(uid, label, couponCode, "PERCENT", 15.0, 1200.0, "Spin & Win")
                }
            }
            showMessage("Spin & Win: $label (+$bonusPoints pts)")
        }
    }

    fun completeScratchCard(label: String, bonusPoints: Int, couponCode: String?) {
        val today = todayKey()
        viewModelScope.launch {
            prefsStore.recordScratch(today, bonusPoints, couponCode)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(uid, mapOf("points" to curPts + bonusPoints))
                if (!couponCode.isNullOrBlank()) {
                    firestoreRepo.addReward(uid, label, couponCode, "FIXED", 100.0, 800.0, "Scratch & Reveal")
                }
            }
            showMessage("Scratch & Reveal unlocked: $label!")
        }
    }

    fun claimDailyStreak() {
        if (!canClaimStreakToday()) {
            showMessage("Today's streak reward already claimed! Come back tomorrow.")
            return
        }
        val today = todayKey()
        val nextStreak = (localPrefs.value.streakCount % 7) + 1
        val bonus = nextStreak * 25
        viewModelScope.launch {
            prefsStore.recordStreak(today, nextStreak, bonus)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(
                    uid,
                    mapOf(
                        "streakCount" to nextStreak.toLong(),
                        "lastCheckInDate" to today,
                        "points" to curPts + bonus
                    )
                )
            }
            showMessage("Day $nextStreak Streak claimed! +$bonus MY Points")
        }
    }

    fun discoverTreasure(treasureId: String, title: String, couponCode: String, bonusPoints: Int) {
        if (localPrefs.value.foundTreasureIds.contains(treasureId)) return
        viewModelScope.launch {
            prefsStore.markTreasureFound(treasureId, bonusPoints, couponCode)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(uid, mapOf("points" to curPts + bonusPoints))
                firestoreRepo.addReward(uid, title, couponCode, "FIXED", 250.0, 1500.0, "Treasure Hunt")
            }
            showMessage("Treasure Found! $title ($couponCode) +$bonusPoints pts!")
        }
    }

    fun challengeProgress(challenge: DailyChallenge): Int {
        val prefs = localPrefs.value
        return when (challenge.id) {
            "ch_explore" -> prefs.exploredCategories.size
            "ch_compare" -> prefs.compareIds.size
            "ch_ai" -> prefs.askedAiCount
            "ch_cart" -> activeCartItems.value.size
            else -> 0
        }
    }

    fun claimChallenge(challenge: DailyChallenge) {
        if (localPrefs.value.claimedChallengeIds.contains(challenge.id)) return
        if (challengeProgress(challenge) < challenge.requiredCount) {
            showMessage("Complete the activity first!")
            return
        }
        viewModelScope.launch {
            prefsStore.claimChallenge(challenge.id, challenge.rewardPoints)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(uid, mapOf("points" to curPts + challenge.rewardPoints))
            }
            showMessage("Challenge completed! +${challenge.rewardPoints} MY Points")
        }
    }

    fun awardQuizPoints(points: Int) {
        viewModelScope.launch {
            prefsStore.addGuestPoints(points)
            _currentUser.value?.uid?.let { uid ->
                val curPts = _userProfile.value?.points ?: 150L
                firestoreRepo.updateProfileFields(uid, mapOf("points" to curPts + points))
            }
            showMessage("Quiz bonus: +$points MY Points!")
        }
    }

    fun toggleFunnyUpvote(id: String) {
        _funnyUpvotedIds.update { set ->
            if (set.contains(id)) set - id else set + id
        }
    }

    fun notifyAiQuestionAsked() {
        viewModelScope.launch { prefsStore.incrementAiAsk() }
    }
}
