package com.example.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.i18n.AppLanguage
import com.example.model.CartLineItem
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

private val Context.myShopDataStore by preferencesDataStore(name = "my_shop_prefs")

data class LocalAppPrefs(
    val language: AppLanguage = AppLanguage.EN,
    val darkMode: Boolean = true,
    val guestCart: List<CartLineItem> = emptyList(),
    val guestWishlistIds: Set<String> = emptySet(),
    val recentlyViewedIds: List<String> = emptyList(),
    val compareIds: List<String> = emptyList(),
    val lastSpinDate: String = "",
    val lastScratchDate: String = "",
    val lastStreakDate: String = "",
    val streakCount: Int = 1,
    val guestPoints: Int = 100,
    val foundTreasureIds: Set<String> = emptySet(),
    val claimedChallengeIds: Set<String> = emptySet(),
    val exploredCategories: Set<String> = emptySet(),
    val askedAiCount: Int = 0,
    val guestWonCoupons: List<String> = emptyList(),
    val popupDismissals: Map<String, Long> = emptyMap(),
    val hasVisitedBefore: Boolean = false
)

class GuestPreferencesStore(private val context: Context) {

    private object Keys {
        val LANGUAGE = stringPreferencesKey("language")
        val DARK_MODE = booleanPreferencesKey("dark_mode")
        val GUEST_CART_JSON = stringPreferencesKey("guest_cart_json")
        val GUEST_WISHLIST = stringPreferencesKey("guest_wishlist")
        val RECENTLY_VIEWED = stringPreferencesKey("recently_viewed")
        val COMPARE_IDS = stringPreferencesKey("compare_ids")
        val LAST_SPIN_DATE = stringPreferencesKey("last_spin_date")
        val LAST_SCRATCH_DATE = stringPreferencesKey("last_scratch_date")
        val LAST_STREAK_DATE = stringPreferencesKey("last_streak_date")
        val STREAK_COUNT = intPreferencesKey("streak_count")
        val GUEST_POINTS = intPreferencesKey("guest_points")
        val FOUND_TREASURES = stringPreferencesKey("found_treasures")
        val CLAIMED_CHALLENGES = stringPreferencesKey("claimed_challenges")
        val EXPLORED_CATEGORIES = stringPreferencesKey("explored_categories")
        val ASKED_AI_COUNT = intPreferencesKey("asked_ai_count")
        val GUEST_COUPONS = stringPreferencesKey("guest_coupons")
        val POPUP_DISMISSALS_JSON = stringPreferencesKey("popup_dismissals_json")
        val HAS_VISITED_BEFORE = booleanPreferencesKey("has_visited_before")
    }

    val prefsFlow: Flow<LocalAppPrefs> = context.myShopDataStore.data.map { prefs ->
        LocalAppPrefs(
            language = if (prefs[Keys.LANGUAGE] == "BN") AppLanguage.BN else AppLanguage.EN,
            darkMode = prefs[Keys.DARK_MODE] ?: true,
            guestCart = decodeCart(prefs[Keys.GUEST_CART_JSON].orEmpty()),
            guestWishlistIds = decodeSet(prefs[Keys.GUEST_WISHLIST]),
            recentlyViewedIds = decodeList(prefs[Keys.RECENTLY_VIEWED]),
            compareIds = decodeList(prefs[Keys.COMPARE_IDS]),
            lastSpinDate = prefs[Keys.LAST_SPIN_DATE].orEmpty(),
            lastScratchDate = prefs[Keys.LAST_SCRATCH_DATE].orEmpty(),
            lastStreakDate = prefs[Keys.LAST_STREAK_DATE].orEmpty(),
            streakCount = prefs[Keys.STREAK_COUNT] ?: 1,
            guestPoints = prefs[Keys.GUEST_POINTS] ?: 100,
            foundTreasureIds = decodeSet(prefs[Keys.FOUND_TREASURES]),
            claimedChallengeIds = decodeSet(prefs[Keys.CLAIMED_CHALLENGES]),
            exploredCategories = decodeSet(prefs[Keys.EXPLORED_CATEGORIES]),
            askedAiCount = prefs[Keys.ASKED_AI_COUNT] ?: 0,
            guestWonCoupons = decodeList(prefs[Keys.GUEST_COUPONS]),
            popupDismissals = decodePopupDismissals(prefs[Keys.POPUP_DISMISSALS_JSON].orEmpty()),
            hasVisitedBefore = prefs[Keys.HAS_VISITED_BEFORE] ?: false
        )
    }

    suspend fun setLanguage(language: AppLanguage) {
        context.myShopDataStore.edit { it[Keys.LANGUAGE] = language.code }
    }

    suspend fun setDarkMode(darkMode: Boolean) {
        context.myShopDataStore.edit { it[Keys.DARK_MODE] = darkMode }
    }

    suspend fun saveGuestCart(items: List<CartLineItem>) {
        context.myShopDataStore.edit { it[Keys.GUEST_CART_JSON] = encodeCart(items) }
    }

    suspend fun clearGuestCart() {
        context.myShopDataStore.edit { it.remove(Keys.GUEST_CART_JSON) }
    }

    suspend fun setGuestWishlist(ids: Set<String>) {
        context.myShopDataStore.edit { it[Keys.GUEST_WISHLIST] = ids.joinToString(",") }
    }

    suspend fun pushRecentlyViewed(productId: String) {
        context.myShopDataStore.edit { prefs ->
            val current = decodeList(prefs[Keys.RECENTLY_VIEWED]).toMutableList()
            current.remove(productId)
            current.add(0, productId)
            prefs[Keys.RECENTLY_VIEWED] = current.take(10).joinToString(",")
        }
    }

    suspend fun setCompareIds(ids: List<String>) {
        context.myShopDataStore.edit { it[Keys.COMPARE_IDS] = ids.take(4).joinToString(",") }
    }

    suspend fun recordSpin(dateKey: String, bonusPoints: Int, couponCode: String?) {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.LAST_SPIN_DATE] = dateKey
            prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + bonusPoints
            if (!couponCode.isNullOrBlank()) {
                val list = decodeList(prefs[Keys.GUEST_COUPONS]).toMutableList()
                if (!list.contains(couponCode)) list.add(couponCode)
                prefs[Keys.GUEST_COUPONS] = list.joinToString(",")
            }
        }
    }

    suspend fun recordScratch(dateKey: String, bonusPoints: Int, couponCode: String?) {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.LAST_SCRATCH_DATE] = dateKey
            prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + bonusPoints
            if (!couponCode.isNullOrBlank()) {
                val list = decodeList(prefs[Keys.GUEST_COUPONS]).toMutableList()
                if (!list.contains(couponCode)) list.add(couponCode)
                prefs[Keys.GUEST_COUPONS] = list.joinToString(",")
            }
        }
    }

    suspend fun recordStreak(dateKey: String, newStreak: Int, bonusPoints: Int) {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.LAST_STREAK_DATE] = dateKey
            prefs[Keys.STREAK_COUNT] = newStreak
            prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + bonusPoints
        }
    }

    suspend fun markTreasureFound(treasureId: String, bonusPoints: Int, couponCode: String?) {
        context.myShopDataStore.edit { prefs ->
            val set = decodeSet(prefs[Keys.FOUND_TREASURES]).toMutableSet()
            if (set.add(treasureId)) {
                prefs[Keys.FOUND_TREASURES] = set.joinToString(",")
                prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + bonusPoints
                if (!couponCode.isNullOrBlank()) {
                    val list = decodeList(prefs[Keys.GUEST_COUPONS]).toMutableList()
                    if (!list.contains(couponCode)) list.add(couponCode)
                    prefs[Keys.GUEST_COUPONS] = list.joinToString(",")
                }
            }
        }
    }

    suspend fun trackCategoryExplore(catName: String) {
        context.myShopDataStore.edit { prefs ->
            val set = decodeSet(prefs[Keys.EXPLORED_CATEGORIES]).toMutableSet()
            set.add(catName)
            prefs[Keys.EXPLORED_CATEGORIES] = set.joinToString(",")
        }
    }

    suspend fun incrementAiAsk() {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.ASKED_AI_COUNT] = (prefs[Keys.ASKED_AI_COUNT] ?: 0) + 1
        }
    }

    suspend fun claimChallenge(challengeId: String, rewardPoints: Int) {
        context.myShopDataStore.edit { prefs ->
            val set = decodeSet(prefs[Keys.CLAIMED_CHALLENGES]).toMutableSet()
            if (set.add(challengeId)) {
                prefs[Keys.CLAIMED_CHALLENGES] = set.joinToString(",")
                prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + rewardPoints
            }
        }
    }

    suspend fun addGuestPoints(points: Int) {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.GUEST_POINTS] = (prefs[Keys.GUEST_POINTS] ?: 100) + points
        }
    }

    suspend fun recordPopupDismissal(popupId: String, timestampMs: Long) {
        context.myShopDataStore.edit { prefs ->
            val current = decodePopupDismissals(prefs[Keys.POPUP_DISMISSALS_JSON].orEmpty()).toMutableMap()
            current[popupId] = timestampMs
            val json = JSONObject().apply {
                current.forEach { (k, v) -> put(k, v) }
            }.toString()
            prefs[Keys.POPUP_DISMISSALS_JSON] = json
            prefs[Keys.HAS_VISITED_BEFORE] = true
        }
    }

    suspend fun markVisited() {
        context.myShopDataStore.edit { prefs ->
            prefs[Keys.HAS_VISITED_BEFORE] = true
        }
    }

    private fun decodePopupDismissals(raw: String): Map<String, Long> {
        if (raw.isBlank()) return emptyMap()
        return try {
            val obj = JSONObject(raw)
            val result = mutableMapOf<String, Long>()
            val keys = obj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                result[key] = obj.optLong(key, 0L)
            }
            result
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun decodeSet(raw: String?): Set<String> =
        raw?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.toSet() ?: emptySet()

    private fun decodeList(raw: String?): List<String> =
        raw?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()

    private fun encodeCart(items: List<CartLineItem>): String {
        val arr = JSONArray()
        items.forEach { item ->
            arr.put(
                JSONObject().apply {
                    put("key", item.key)
                    put("productId", item.productId)
                    put("productName", item.productName)
                    put("unitPrice", item.unitPrice)
                    put("originalPrice", item.originalPrice)
                    put("quantity", item.quantity)
                    put("selectedColor", item.selectedColor)
                    put("selectedSize", item.selectedSize)
                    put("freeDelivery", item.freeDelivery)
                    put("savedForLater", item.savedForLater)
                }
            )
        }
        return arr.toString()
    }

    private fun decodeCart(raw: String): List<CartLineItem> {
        if (raw.isBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).mapNotNull { idx ->
                val obj = arr.optJSONObject(idx) ?: return@mapNotNull null
                CartLineItem(
                    key = obj.optString("key"),
                    productId = obj.optString("productId"),
                    productName = obj.optString("productName"),
                    unitPrice = obj.optDouble("unitPrice", 0.0),
                    originalPrice = obj.optDouble("originalPrice", 0.0),
                    quantity = obj.optInt("quantity", 1).coerceIn(1, 99),
                    selectedColor = obj.optString("selectedColor"),
                    selectedSize = obj.optString("selectedSize"),
                    freeDelivery = obj.optBoolean("freeDelivery", false),
                    savedForLater = obj.optBoolean("savedForLater", false)
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
