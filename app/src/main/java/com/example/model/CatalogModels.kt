package com.example.model

import androidx.compose.ui.graphics.Color

enum class CategoryId(val titleEn: String, val titleBn: String, val iconName: String) {
    MOBILES("Mobiles & Tablets", "মোবাইল ও ট্যাবলেট", "smartphone"),
    COMPUTERS("Computers & Laptops", "কম্পিউটার ও ল্যাপটপ", "laptop"),
    ELECTRONICS("Electronics", "ইলেকট্রনিক্স", "headphones"),
    FASHION("Fashion & Clothing", "ফ্যাশন ও পোশাক", "checkroom"),
    SHOES("Shoes", "জুতা", "steps"),
    BEAUTY("Beauty & Personal Care", "সৌন্দর্য ও ব্যক্তিগত যত্ন", "spa"),
    HOME_LIVING("Home & Living", "ঘর ও জীবনযাপন", "chair"),
    FURNITURE("Furniture", "আসবাবপত্র", "weekend"),
    TOYS("Toys & Games", "খেলনা ও গেমস", "toys"),
    SPORTS("Sports & Fitness", "খেলাধুলা ও ফিটনেস", "fitness"),
    BOOKS("Books & Stationery", "বই ও স্টেশনারি", "menu_book"),
    GROCERY("Grocery", "মুদি ও খাদ্যপণ্য", "shopping_basket"),
    BABY("Baby Products", "শিশু পণ্য", "child_care"),
    ACCESSORIES("Accessories", "অ্যাক্সেসরিজ", "watch"),
    GAMING("Gaming Products", "গেমিং পণ্য", "sports_esports"),
    AUTOMOTIVE("Automotive", "অটোমোটিভ", "directions_car")
}

data class Category(
    val id: CategoryId,
    val accentColor: Color,
    val secondaryColor: Color,
    val badgeText: String
)

data class ProductSpec(
    val label: String,
    val value: String
)

data class ProductReview(
    val id: String,
    val author: String,
    val rating: Int,
    val comment: String,
    val dateLabel: String,
    val verifiedPurchase: Boolean = true
)

data class ProductQA(
    val id: String,
    val question: String,
    val answer: String,
    val askedBy: String
)

data class SellerInfo(
    val name: String,
    val rating: Double,
    val shipFrom: String,
    val verified: Boolean = true
)

data class Product(
    val id: String,
    val name: String,
    val nameBn: String,
    val brand: String,
    val category: CategoryId,
    val price: Double,
    val originalPrice: Double,
    val stock: Int,
    val rating: Double,
    val reviewCount: Int,
    val description: String,
    val colors: List<String>,
    val sizes: List<String>,
    val specs: List<ProductSpec>,
    val seller: SellerInfo,
    val freeDelivery: Boolean,
    val deliveryDaysMin: Int,
    val deliveryDaysMax: Int,
    val flashSale: Boolean = false,
    val todaysDeal: Boolean = false,
    val trending: Boolean = false,
    val featured: Boolean = false,
    val newArrival: Boolean = false,
    val bestSeller: Boolean = false,
    val accentColor: Color,
    val secondaryColor: Color,
    val imageViews: List<String>,
    val reviews: List<ProductReview>,
    val qaList: List<ProductQA>,
    val relatedIds: List<String>,
    val frequentlyBoughtIds: List<String>
) {
    val discountPercent: Int
        get() = if (originalPrice > price && originalPrice > 0) {
            (((originalPrice - price) / originalPrice) * 100).toInt()
        } else 0
}

data class BrandInfo(
    val name: String,
    val tagline: String,
    val accentColor: Color
)

data class CouponRule(
    val code: String,
    val title: String,
    val discountType: String, // "PERCENT", "FIXED", "FREE_DELIVERY"
    val value: Double,
    val minSpend: Double,
    val expiresLabel: String
)

data class FunnyCard(
    val id: String,
    val title: String,
    val joke: String,
    val fakeTagPrice: String,
    val punchline: String,
    val initialLaughs: Int
)

data class QuizQuestion(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int,
    val explanation: String
)

data class DailyChallenge(
    val id: String,
    val title: String,
    val description: String,
    val rewardPoints: Int,
    val requiredCount: Int
)

enum class SortOption(val labelEn: String, val labelBn: String) {
    POPULAR("Popularity", "জনপ্রিয়তা"),
    PRICE_LOW("Price: Low to High", "কম থেকে বেশি দাম"),
    PRICE_HIGH("Price: High to Low", "বেশি থেকে কম দাম"),
    NEWEST("Newest First", "সর্বশেষ"),
    TOP_RATED("Highest Rated", "সর্বোচ্চ রেটিং")
}
