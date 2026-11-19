package com.example.data

import android.graphics.Bitmap
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.Content
import com.google.firebase.ai.type.content
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withTimeout

class AiAssistantRepository {

    private val shoppingModel by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            systemInstruction = content {
                text(
                    """
                    You are MY AI, the official shopping assistant for MY Shop ("Shop Smart • Live Happy!").
                    STRICT GROUNDING RULES:
                    1. ONLY recommend real products from the MY SHOP LIVE INVENTORY CATALOG below.
                    2. NEVER invent product names, prices, stock counts, or delivery terms.
                    3. Always quote exact prices in BDT (৳) and mention the product ID inside brackets like [ID:p_mob_1] whenever you recommend a product so the app can render interactive product cards!
                    4. Support both English and Bengali queries naturally. Keep answers concise, helpful, and shopper-friendly.

                    ${CatalogRepository.catalogSummaryForAi()}
                    """.trimIndent()
                )
            }
        )
    }

    private val supportModel by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash",
            systemInstruction = content {
                text(
                    """
                    You are MY Shop Customer Support AI Helper.
                    Answer questions concisely about:
                    - Shipping & Delivery: 1-3 business days in Dhaka, 2-4 days nationwide. Free delivery on orders >= ৳2,000 or items tagged Free Delivery.
                    - Payments: bKash, Nagad, Rocket, Local Cards, Cash on Delivery, Visa, Mastercard, PayPal (Sandbox mode active for test checkout). We NEVER store customer PINs or OTPs.
                    - Returns & Refunds: 7-day easy return on eligible sealed/unused or defective items. Pending/Confirmed orders can be cancelled in My Orders.
                    - Fun Zone: 1 free Spin & Win and 1 free Scratch & Reveal daily, Shopping Streak, Treasure Hunt, Quiz, and Challenges. No paid gambling.
                    """.trimIndent()
                )
            }
        )
    }

    fun streamShoppingReply(history: List<Pair<String, String>>, userPrompt: String): Flow<String> {
        val chatHistory: List<Content> = history.map { (role, msg) ->
            content(role) { text(msg) }
        }
        val chat = shoppingModel.startChat(history = chatHistory)
        return chat.sendMessageStream(userPrompt).map { chunk -> chunk.text.orEmpty() }
    }

    suspend fun analyzePhotoAndRecommend(bitmap: Bitmap, userQuery: String): String {
        val promptText = userQuery.ifBlank {
            "Identify what product or style is in this photo and recommend the closest real available products from MY Shop with their [ID:...] tags."
        }
        val response = withTimeout(60_000L) {
            shoppingModel.generateContent(
                content {
                    image(bitmap)
                    text(promptText)
                }
            )
        }
        return response.text ?: "I analyzed the image, but couldn't generate a recommendation right now."
    }

    suspend fun askSupport(question: String, orderContext: String): String {
        val fullPrompt = if (orderContext.isNotBlank()) {
            "Customer recent orders context: $orderContext\n\nCustomer question: $question"
        } else question
        val response = withTimeout(60_000L) {
            supportModel.generateContent(fullPrompt)
        }
        return response.text ?: "Please try again or open a support ticket below."
    }
}
