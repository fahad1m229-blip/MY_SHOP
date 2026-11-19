package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.auth.attemptAutoSignIn
import com.example.auth.authStateFlow
import com.example.auth.configureAppCheck
import com.example.data.CatalogRepository
import com.example.data.GuestPreferencesStore
import com.example.data.MyShopFirestoreRepository
import com.example.i18n.stringsFor
import com.example.ui.components.AuthGateBottomSheet
import com.example.ui.components.MyShopTopHeader
import com.example.ui.screens.*
import com.example.ui.theme.LocalMyShopColors
import com.example.ui.theme.MyShopTheme
import com.example.viewmodel.AiViewModel
import com.example.viewmodel.ShopViewModel
import com.google.firebase.Firebase
import com.google.firebase.auth.auth

private object Routes {
    const val HOME = "home"
    const val EXPLORE = "explore"
    const val FUN_ZONE = "fun_zone"
    const val AI_ASSISTANT = "ai_assistant"
    const val CART = "cart"
    const val ACCOUNT = "account"
    const val PRODUCT_DETAIL = "product/{productId}"
    const val CHECKOUT = "checkout"
    const val ORDERS = "orders"
    const val NOTIFICATIONS = "notifications"
    const val SUPPORT = "support"
}

private data class NavDestinationItem(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure Firebase App Check BEFORE setContent, ViewModels, or Firebase operations
        configureAppCheck(this, intent)
        enableEdgeToEdge()

        setContent {
            MyShopAppRoot()
        }
    }
}

@Composable
fun MyShopAppRoot() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }

    val shopViewModel: ShopViewModel = viewModel(
        factory = viewModelFactory {
            initializer {
                val app = checkNotNull(this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY])
                ShopViewModel(
                    firestoreRepo = MyShopFirestoreRepository(app),
                    prefsStore = GuestPreferencesStore(app)
                )
            }
        }
    )
    val aiViewModel: AiViewModel = viewModel()

    val currentUser by Firebase.auth.authStateFlow().collectAsStateWithLifecycle(initialValue = Firebase.auth.currentUser)

    LaunchedEffect(currentUser) {
        shopViewModel.onAuthStateChanged(currentUser)
    }

    // Silent auto sign-in check on startup for returning Google users (never interrupts guests)
    LaunchedEffect(Unit) {
        attemptAutoSignIn(
            context = context,
            credentialManager = credentialManager,
            onAuthSuccess = {},
            onUnauthenticated = {},
            scope = scope
        )
    }

    val prefs by shopViewModel.localPrefs.collectAsStateWithLifecycle()
    val strings = remember(prefs.language) { stringsFor(prefs.language) }
    val filteredProducts by shopViewModel.filteredProducts.collectAsStateWithLifecycle()
    val filterState by shopViewModel.filterState.collectAsStateWithLifecycle()
    val activeCart by shopViewModel.activeCartItems.collectAsStateWithLifecycle()
    val savedForLater by shopViewModel.savedForLaterItems.collectAsStateWithLifecycle()
    val cartBadgeCount by shopViewModel.cartBadgeCount.collectAsStateWithLifecycle()
    val wishlistIds by shopViewModel.wishlistProductIds.collectAsStateWithLifecycle()
    val flashCountdown by shopViewModel.flashCountdownSeconds.collectAsStateWithLifecycle()
    val appliedCoupon by shopViewModel.appliedCouponCode.collectAsStateWithLifecycle()
    val checkoutDraft by shopViewModel.checkoutDraft.collectAsStateWithLifecycle()
    val userProfile by shopViewModel.userProfile.collectAsStateWithLifecycle()
    val addresses by shopViewModel.addresses.collectAsStateWithLifecycle()
    val orders by shopViewModel.orders.collectAsStateWithLifecycle()
    val rewards by shopViewModel.rewards.collectAsStateWithLifecycle()
    val notifications by shopViewModel.notifications.collectAsStateWithLifecycle()
    val tickets by shopViewModel.supportTickets.collectAsStateWithLifecycle()
    val userReviews by shopViewModel.userReviews.collectAsStateWithLifecycle()
    val sessionQa by shopViewModel.sessionQa.collectAsStateWithLifecycle()
    val funnyUpvoted by shopViewModel.funnyUpvotedIds.collectAsStateWithLifecycle()
    val activePoints by shopViewModel.activePoints.collectAsStateWithLifecycle()
    val snackbarMessage by shopViewModel.snackbarMessage.collectAsStateWithLifecycle()
    val authPromptReason by shopViewModel.showAuthPrompt.collectAsStateWithLifecycle()
    val isUploadingAvatar by shopViewModel.isUploadingAvatar.collectAsStateWithLifecycle()
    val adminAnnouncement by shopViewModel.adminAnnouncement.collectAsStateWithLifecycle()
    val activePopups by shopViewModel.activePopups.collectAsStateWithLifecycle()

    val aiMessages by aiViewModel.messages.collectAsStateWithLifecycle()
    val aiUiState by aiViewModel.uiState.collectAsStateWithLifecycle()
    val supportReply by aiViewModel.supportReply.collectAsStateWithLifecycle()
    val isSupportLoading by aiViewModel.isSupportLoading.collectAsStateWithLifecycle()

    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            shopViewModel.clearMessage()
        }
    }

    val topLevelRoutes = setOf(
        Routes.HOME, Routes.EXPLORE, Routes.FUN_ZONE, Routes.AI_ASSISTANT, Routes.CART, Routes.ACCOUNT
    )
    val showMainChrome = currentRoute in topLevelRoutes

    val navItems = listOf(
        NavDestinationItem(Routes.HOME, strings.navHome, Icons.Filled.Home, Icons.Outlined.Home),
        NavDestinationItem(Routes.EXPLORE, strings.navExplore, Icons.Filled.GridView, Icons.Outlined.GridView),
        NavDestinationItem(Routes.FUN_ZONE, strings.navFunZone, Icons.Filled.Casino, Icons.Outlined.Casino),
        NavDestinationItem(Routes.AI_ASSISTANT, strings.navAi, Icons.Filled.AutoAwesome, Icons.Outlined.AutoAwesome),
        NavDestinationItem(Routes.CART, strings.navCart, Icons.Filled.ShoppingCart, Icons.Outlined.ShoppingCart),
        NavDestinationItem(Routes.ACCOUNT, strings.navAccount, Icons.Filled.Person, Icons.Outlined.Person)
    )

    val (subtotal, discount, deliveryFee) = remember(activeCart, appliedCoupon, rewards, prefs.guestWonCoupons) {
        shopViewModel.calculateTotals(activeCart, appliedCoupon)
    }

    val darkTheme = userProfile?.darkMode ?: prefs.darkMode

    MyShopTheme(darkTheme = darkTheme) {
        val ext = LocalMyShopColors.current
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val useNavRail = maxWidth >= 600.dp

            Row(modifier = Modifier.fillMaxSize()) {
                if (showMainChrome && useNavRail) {
                    NavigationRail(
                        containerColor = MaterialTheme.colorScheme.surface,
                        modifier = Modifier.windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Vertical + WindowInsetsSides.Start))
                    ) {
                        Spacer(Modifier.height(12.dp))
                        navItems.forEach { item ->
                            val selected = currentRoute == item.route
                            NavigationRailItem(
                                selected = selected,
                                onClick = {
                                    navController.navigate(item.route) {
                                        popUpTo(Routes.HOME) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    BadgedBox(
                                        badge = {
                                            if (item.route == Routes.CART && cartBadgeCount > 0) {
                                                Badge(containerColor = ext.hotPink) {
                                                    Text("$cartBadgeCount", color = Color.White)
                                                }
                                            }
                                        }
                                    ) {
                                        Icon(if (selected) item.selectedIcon else item.unselectedIcon, contentDescription = item.label)
                                    }
                                },
                                label = { Text(item.label, maxLines = 1) }
                            )
                        }
                    }
                }

                Scaffold(
                    modifier = Modifier.weight(1f),
                    snackbarHost = { SnackbarHost(snackbarHostState) },
                    contentWindowInsets = WindowInsets.safeDrawing,
                    topBar = {
                        if (showMainChrome) {
                            MyShopTopHeader(
                                language = prefs.language,
                                darkMode = darkTheme,
                                unreadNotifications = notifications.count { !it.read },
                                onToggleLanguage = { shopViewModel.toggleLanguage() },
                                onToggleTheme = { shopViewModel.toggleDarkMode() },
                                onNotificationsClick = {
                                    if (currentUser == null) {
                                        shopViewModel.requestAuth("Sign in with Google to view your personalized Order, Price-Drop, and Reward notifications.")
                                    } else {
                                        navController.navigate(Routes.NOTIFICATIONS)
                                    }
                                }
                            )
                        }
                    },
                    bottomBar = {
                        if (showMainChrome && !useNavRail) {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface
                            ) {
                                navItems.forEach { item ->
                                    val selected = currentRoute == item.route
                                    NavigationBarItem(
                                        selected = selected,
                                        onClick = {
                                            navController.navigate(item.route) {
                                                popUpTo(Routes.HOME) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        },
                                        icon = {
                                            BadgedBox(
                                                badge = {
                                                    if (item.route == Routes.CART && cartBadgeCount > 0) {
                                                        Badge(containerColor = ext.hotPink) {
                                                            Text("$cartBadgeCount", color = Color.White)
                                                        }
                                                    }
                                                }
                                            ) {
                                                Icon(if (selected) item.selectedIcon else item.unselectedIcon, contentDescription = item.label)
                                            }
                                        },
                                        label = { Text(item.label, maxLines = 1) }
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    NavHost(
                        navController = navController,
                        startDestination = Routes.HOME,
                        modifier = Modifier.padding(innerPadding)
                    ) {
                        composable(Routes.HOME) {
                            HomeScreen(
                                strings = strings,
                                prefs = prefs,
                                wishlistIds = wishlistIds,
                                flashCountdownSeconds = flashCountdown,
                                isSignedIn = currentUser != null,
                                onOpenProduct = { pid ->
                                    shopViewModel.markProductViewed(pid)
                                    navController.navigate("product/$pid")
                                },
                                onOpenCategory = { catId ->
                                    shopViewModel.selectCategory(catId)
                                    navController.navigate(Routes.EXPLORE)
                                },
                                onSearchSubmit = { q ->
                                    shopViewModel.updateSearchQuery(q)
                                    navController.navigate(Routes.EXPLORE)
                                },
                                onOpenBrand = { brand ->
                                    shopViewModel.selectBrand(brand)
                                    navController.navigate(Routes.EXPLORE)
                                },
                                onOpenFunZone = { navController.navigate(Routes.FUN_ZONE) },
                                onOpenAiAssistant = { navController.navigate(Routes.AI_ASSISTANT) },
                                onAddToCart = { prod -> shopViewModel.addToCart(prod) },
                                onToggleWishlist = { prod -> shopViewModel.toggleWishlist(prod) },
                                onToggleCompare = { prod -> shopViewModel.toggleCompare(prod) },
                                onDiscoverTreasure = { id, title, code, pts ->
                                    shopViewModel.discoverTreasure(id, title, code, pts)
                                },
                                onSignInClick = {
                                    shopViewModel.requestAuth("Sign in with Google to unlock synced carts, orders, and exclusive rewards.")
                                },
                                adminAnnouncement = adminAnnouncement,
                                activePopups = activePopups
                            )
                        }

                        composable(Routes.EXPLORE) {
                            ExploreScreen(
                                strings = strings,
                                products = filteredProducts,
                                filterState = filterState,
                                prefs = prefs,
                                wishlistIds = wishlistIds,
                                onUpdateQuery = { shopViewModel.updateSearchQuery(it) },
                                onSelectCategory = { shopViewModel.selectCategory(it) },
                                onSelectBrand = { shopViewModel.selectBrand(it) },
                                onUpdateFilters = { p, r, f, s -> shopViewModel.updateFilters(p, r, f, s) },
                                onResetFilters = { shopViewModel.resetFilters() },
                                onOpenProduct = { pid ->
                                    shopViewModel.markProductViewed(pid)
                                    navController.navigate("product/$pid")
                                },
                                onAddToCart = { prod -> shopViewModel.addToCart(prod) },
                                onToggleWishlist = { prod -> shopViewModel.toggleWishlist(prod) },
                                onToggleCompare = { prod -> shopViewModel.toggleCompare(prod) },
                                onRemoveCompare = { pid -> shopViewModel.removeCompare(pid) },
                                onDiscoverTreasure = { id, title, code, pts ->
                                    shopViewModel.discoverTreasure(id, title, code, pts)
                                }
                            )
                        }

                        composable(Routes.FUN_ZONE) {
                            FunZoneScreen(
                                strings = strings,
                                prefs = prefs,
                                activePoints = activePoints,
                                funnyUpvotedIds = funnyUpvoted,
                                canSpinToday = shopViewModel.canSpinToday(),
                                canScratchToday = shopViewModel.canScratchToday(),
                                canClaimStreakToday = shopViewModel.canClaimStreakToday(),
                                challengeProgress = { ch -> shopViewModel.challengeProgress(ch) },
                                onSpinComplete = { label, pts, code -> shopViewModel.completeDailySpin(label, pts, code) },
                                onScratchComplete = { label, pts, code -> shopViewModel.completeScratchCard(label, pts, code) },
                                onClaimStreak = { shopViewModel.claimDailyStreak() },
                                onClaimChallenge = { ch -> shopViewModel.claimChallenge(ch) },
                                onQuizCorrect = { pts -> shopViewModel.awardQuizPoints(pts) },
                                onToggleFunnyUpvote = { id -> shopViewModel.toggleFunnyUpvote(id) },
                                onDiscoverTreasure = { id, title, code, pts -> shopViewModel.discoverTreasure(id, title, code, pts) },
                                onOpenProduct = { pid ->
                                    shopViewModel.markProductViewed(pid)
                                    navController.navigate("product/$pid")
                                }
                            )
                        }

                        composable(Routes.AI_ASSISTANT) {
                            AiAssistantScreen(
                                strings = strings,
                                messages = aiMessages,
                                uiState = aiUiState,
                                onSendPrompt = { prompt ->
                                    aiViewModel.sendShoppingPrompt(prompt) {
                                        shopViewModel.notifyAiQuestionAsked()
                                    }
                                },
                                onAnalyzePhoto = { bmp, query ->
                                    aiViewModel.analyzeProductPhoto(bmp, query) {
                                        shopViewModel.notifyAiQuestionAsked()
                                    }
                                },
                                onOpenProduct = { pid ->
                                    shopViewModel.markProductViewed(pid)
                                    navController.navigate("product/$pid")
                                },
                                onAddToCart = { prod -> shopViewModel.addToCart(prod) }
                            )
                        }

                        composable(Routes.CART) {
                            CartScreen(
                                strings = strings,
                                activeItems = activeCart,
                                savedItems = savedForLater,
                                availableCoupons = shopViewModel.availableCoupons(),
                                appliedCouponCode = appliedCoupon,
                                subtotal = subtotal,
                                discount = discount,
                                deliveryFee = deliveryFee,
                                onUpdateQty = { item, delta -> shopViewModel.updateCartQuantity(item, delta) },
                                onToggleSaveForLater = { item -> shopViewModel.toggleSaveForLater(item) },
                                onRemoveItem = { item -> shopViewModel.removeFromCart(item) },
                                onApplyCoupon = { code -> shopViewModel.applyCoupon(code) },
                                onClearCoupon = { shopViewModel.clearCoupon() },
                                onOpenProduct = { pid -> navController.navigate("product/$pid") },
                                onExploreClick = { navController.navigate(Routes.EXPLORE) },
                                onProceedCheckout = {
                                    shopViewModel.startCheckout {
                                        navController.navigate(Routes.CHECKOUT)
                                    }
                                }
                            )
                        }

                        composable(Routes.ACCOUNT) {
                            AccountDashboardScreen(
                                strings = strings,
                                currentUser = currentUser,
                                userProfile = userProfile,
                                prefs = prefs,
                                orders = orders,
                                wishlistIds = wishlistIds,
                                rewards = rewards,
                                notifications = notifications,
                                addresses = addresses,
                                onRequestSignIn = {
                                    shopViewModel.requestAuth("Sign in with Google to access your orders, saved addresses, and wallet.")
                                },
                                onOpenOrders = {
                                    if (currentUser == null) {
                                        shopViewModel.requestAuth("Sign in with Google to view your My Orders dashboard.")
                                    } else {
                                        navController.navigate(Routes.ORDERS)
                                    }
                                },
                                onOpenSupport = { navController.navigate(Routes.SUPPORT) },
                                onOpenNotifications = {
                                    if (currentUser == null) {
                                        shopViewModel.requestAuth("Sign in with Google to view your Notifications Center.")
                                    } else {
                                        navController.navigate(Routes.NOTIFICATIONS)
                                    }
                                },
                                onOpenProduct = { pid -> navController.navigate("product/$pid") },
                                onSaveAddress = { l, n, p, s, c, z, co, d -> shopViewModel.saveAddress(l, n, p, s, c, z, co, d) },
                                onDeleteAddress = { id -> shopViewModel.deleteAddress(id) },
                                onToggleLanguage = { shopViewModel.toggleLanguage() },
                                onToggleDarkMode = { shopViewModel.toggleDarkMode() },
                                onUpdateNotificationPrefs = { m, o, p -> shopViewModel.updateNotificationPrefs(m, o, p) },
                                isUploadingAvatar = isUploadingAvatar,
                                onUploadAvatar = { uri -> shopViewModel.uploadProfileAvatar(context, uri) }
                            )
                        }

                        composable(
                            route = Routes.PRODUCT_DETAIL,
                            arguments = listOf(navArgument("productId") { type = NavType.StringType })
                        ) { entry ->
                            val productId = entry.arguments?.getString("productId").orEmpty()
                            val product = CatalogRepository.findProduct(productId)
                            if (product != null) {
                                ProductDetailScreen(
                                    product = product,
                                    strings = strings,
                                    prefs = prefs,
                                    isWishlisted = wishlistIds.contains(product.id),
                                    isCompared = prefs.compareIds.contains(product.id),
                                    userReviews = userReviews,
                                    extraQa = sessionQa[product.id] ?: emptyList(),
                                    onBack = { navController.popBackStack() },
                                    onAddToCart = { p, c, s, q -> shopViewModel.addToCart(p, c, s, q) },
                                    onBuyNow = { p, c, s ->
                                        shopViewModel.addToCart(p, c, s, 1)
                                        shopViewModel.startCheckout {
                                            navController.navigate(Routes.CHECKOUT)
                                        }
                                    },
                                    onToggleWishlist = { p -> shopViewModel.toggleWishlist(p) },
                                    onToggleCompare = { p -> shopViewModel.toggleCompare(p) },
                                    onOpenProduct = { pid ->
                                        shopViewModel.markProductViewed(pid)
                                        navController.navigate("product/$pid")
                                    },
                                    onSubmitReview = { pid, rating, comment -> shopViewModel.submitProductReview(pid, rating, comment) },
                                    onAskQuestion = { pid, q -> shopViewModel.askProductQuestion(pid, q) },
                                    onDiscoverTreasure = { id, title, code, pts -> shopViewModel.discoverTreasure(id, title, code, pts) },
                                    onToggleAlerts = { shopViewModel.toggleWishlist(product, requireAccount = true) }
                                )
                            }
                        }

                        composable(Routes.CHECKOUT) {
                            CheckoutScreen(
                                strings = strings,
                                draft = checkoutDraft,
                                addresses = addresses,
                                items = activeCart,
                                subtotal = subtotal,
                                discount = discount,
                                deliveryFee = deliveryFee,
                                onBack = { navController.popBackStack() },
                                onSetStep = { step -> shopViewModel.setCheckoutStep(step) },
                                onSelectAddress = { addr -> shopViewModel.selectCheckoutAddress(addr) },
                                onSaveNewAddress = { l, n, p, s, c, z, co, d -> shopViewModel.saveAddress(l, n, p, s, c, z, co, d) },
                                onSelectPayment = { method -> shopViewModel.selectPaymentMethod(method) },
                                onCreateOrder = {
                                    shopViewModel.createPendingOrder {
                                        shopViewModel.showMessage("Order ${it.orderNumber} confirmed!")
                                        navController.navigate(Routes.ORDERS) {
                                            popUpTo(Routes.CART)
                                        }
                                    }
                                },
                                onVerifySandboxPayment = { outcome ->
                                    shopViewModel.verifySandboxPayment(outcome) { success, txRef ->
                                        if (success) {
                                            shopViewModel.showMessage("Payment Verified ($txRef)!")
                                            navController.navigate(Routes.ORDERS) {
                                                popUpTo(Routes.CART)
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        composable(Routes.ORDERS) {
                            OrdersScreen(
                                orders = orders,
                                onBack = { navController.popBackStack() },
                                onRetryPayment = { order ->
                                    shopViewModel.retryOrderPayment(order) {
                                        navController.navigate(Routes.CHECKOUT)
                                    }
                                },
                                onCancelOrder = { order -> shopViewModel.cancelOrder(order) },
                                onRequestReturn = { order -> shopViewModel.requestReturn(order) },
                                onAdvanceTracking = { order -> shopViewModel.advanceTrackingStep(order) },
                                onReorder = { order ->
                                    shopViewModel.reorderItems(order)
                                    navController.navigate(Routes.CART)
                                }
                            )
                        }

                        composable(Routes.NOTIFICATIONS) {
                            NotificationsScreen(
                                notifications = notifications,
                                onBack = { navController.popBackStack() },
                                onMarkRead = { id -> shopViewModel.markNotificationRead(id) }
                            )
                        }

                        composable(Routes.SUPPORT) {
                            SupportScreen(
                                tickets = tickets,
                                aiReply = supportReply,
                                isAiLoading = isSupportLoading,
                                onBack = { navController.popBackStack() },
                                onAskSupportAi = { q ->
                                    val orderSummary = orders.take(3).joinToString("; ") { "${it.orderNumber} (${it.orderStatus})" }
                                    aiViewModel.askSupportQuestion(q, orderSummary)
                                },
                                onSubmitTicket = { sub, ord, cat, msg ->
                                    shopViewModel.createSupportTicket(sub, ord, cat, msg)
                                }
                            )
                        }
                    }
                }
            }

            // Auth Gate Modal Sheet (Only appears when guest attempts Checkout / Wishlist sync / Review / Account)
            authPromptReason?.let { reason ->
                AuthGateBottomSheet(
                    reason = reason,
                    onDismiss = { shopViewModel.dismissAuthPrompt() },
                    onAuthSuccess = { shopViewModel.dismissAuthPrompt() }
                )
            }
        }
    }
}
