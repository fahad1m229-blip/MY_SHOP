package com.example.viewmodel

import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.AiAssistantRepository
import com.example.data.CatalogRepository
import com.example.model.Product
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

data class AiChatMessage(
    val id: String,
    val isUser: Boolean,
    val text: String,
    val recommendedProducts: List<Product> = emptyList(),
    val isStreaming: Boolean = false
)

sealed interface AiUiState {
    data object Idle : AiUiState
    data object Thinking : AiUiState
    data class Error(val message: String) : AiUiState
}

class AiViewModel(
    private val aiRepo: AiAssistantRepository = AiAssistantRepository()
) : ViewModel() {

    private val _messages = MutableStateFlow(
        listOf(
            AiChatMessage(
                id = "welcome_ai",
                isUser = false,
                text = "Hi! I'm MY AI, your personal MY Shop assistant. Ask me for phones under ৳20,000, gaming gear, product comparisons, or upload a photo to find matching items!",
                recommendedProducts = listOfNotNull(
                    CatalogRepository.findProduct("p_mob_1"),
                    CatalogRepository.findProduct("p_elec_1")
                )
            )
        )
    )
    val messages: StateFlow<List<AiChatMessage>> = _messages.asStateFlow()

    private val _uiState = MutableStateFlow<AiUiState>(AiUiState.Idle)
    val uiState: StateFlow<AiUiState> = _uiState.asStateFlow()

    private val _supportReply = MutableStateFlow<String?>(null)
    val supportReply: StateFlow<String?> = _supportReply.asStateFlow()

    private val _isSupportLoading = MutableStateFlow(false)
    val isSupportLoading: StateFlow<Boolean> = _isSupportLoading.asStateFlow()

    fun sendShoppingPrompt(prompt: String, onAsked: () -> Unit = {}) {
        val clean = prompt.trim()
        if (clean.isEmpty() || _uiState.value is AiUiState.Thinking) return
        onAsked()

        val userMsg = AiChatMessage("u_${System.currentTimeMillis()}", isUser = true, text = clean)
        val assistantId = "a_${System.currentTimeMillis() + 1}"
        val historyPairs = _messages.value
            .filter { it.id != "welcome_ai" }
            .takeLast(8)
            .map { (if (it.isUser) "user" else "model") to it.text }

        _messages.update { it + userMsg + AiChatMessage(assistantId, isUser = false, text = "", isStreaming = true) }
        _uiState.value = AiUiState.Thinking

        viewModelScope.launch {
            val builder = StringBuilder()
            try {
                withTimeout(60_000L) {
                    aiRepo.streamShoppingReply(historyPairs, clean).collect { chunk ->
                        builder.append(chunk)
                        val partial = builder.toString()
                        val matched = extractRecommendedProducts(partial)
                        _messages.update { list ->
                            list.map {
                                if (it.id == assistantId) it.copy(text = partial, recommendedProducts = matched)
                                else it
                            }
                        }
                    }
                }
                val finalText = builder.toString().ifBlank {
                    "Here are top matching MY Shop picks for you!"
                }
                val matched = extractRecommendedProducts(finalText)
                _messages.update { list ->
                    list.map {
                        if (it.id == assistantId) {
                            it.copy(
                                text = cleanDisplayTags(finalText),
                                recommendedProducts = matched,
                                isStreaming = false
                            )
                        } else it
                    }
                }
                _uiState.value = AiUiState.Idle
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "AI request timed out", e)
                finalizeError(assistantId, "Request timed out after 60s. Please try again.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "AI shopping assistant error", e)
                finalizeError(assistantId, e.localizedMessage ?: "MY AI could not respond right now.")
            }
        }
    }

    fun analyzeProductPhoto(bitmap: Bitmap, query: String, onAsked: () -> Unit = {}) {
        if (_uiState.value is AiUiState.Thinking) return
        onAsked()
        val label = query.ifBlank { "Find matching products from this photo" }
        val userMsg = AiChatMessage("u_${System.currentTimeMillis()}", isUser = true, text = "[Photo Attached] $label")
        val assistantId = "a_${System.currentTimeMillis() + 1}"
        _messages.update { it + userMsg + AiChatMessage(assistantId, isUser = false, text = "Analyzing photo...", isStreaming = true) }
        _uiState.value = AiUiState.Thinking

        viewModelScope.launch {
            try {
                val reply = aiRepo.analyzePhotoAndRecommend(bitmap, label)
                val matched = extractRecommendedProducts(reply)
                _messages.update { list ->
                    list.map {
                        if (it.id == assistantId) {
                            it.copy(
                                text = cleanDisplayTags(reply),
                                recommendedProducts = matched,
                                isStreaming = false
                            )
                        } else it
                    }
                }
                _uiState.value = AiUiState.Idle
            } catch (e: TimeoutCancellationException) {
                finalizeError(assistantId, "Image analysis timed out. Please try a smaller photo.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "AI image analysis error", e)
                finalizeError(assistantId, e.localizedMessage ?: "Photo analysis failed.")
            }
        }
    }

    fun askSupportQuestion(question: String, orderContext: String) {
        val clean = question.trim()
        if (clean.isEmpty() || _isSupportLoading.value) return
        _isSupportLoading.value = true
        viewModelScope.launch {
            try {
                val answer = aiRepo.askSupport(clean, orderContext)
                _supportReply.value = answer
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Support AI failed", e)
                _supportReply.value = "Support AI unavailable: ${e.localizedMessage ?: "Please submit a ticket below."}"
            } finally {
                _isSupportLoading.value = false
            }
        }
    }

    private fun finalizeError(assistantId: String, errorMsg: String) {
        _messages.update { list ->
            list.map {
                if (it.id == assistantId) it.copy(text = "Error: $errorMsg", isStreaming = false)
                else it
            }
        }
        _uiState.value = AiUiState.Error(errorMsg)
    }

    private fun extractRecommendedProducts(text: String): List<Product> {
        val regex = Regex("\\[ID:([a-zA-Z0-9_]+)]")
        val ids = regex.findAll(text).map { it.groupValues[1] }.distinct().toList()
        val direct = ids.mapNotNull { CatalogRepository.findProduct(it) }
        if (direct.isNotEmpty()) return direct.take(4)

        val lower = text.lowercase()
        return CatalogRepository.products.filter { lower.contains(it.name.lowercase()) }.take(3)
    }

    private fun cleanDisplayTags(text: String): String =
        text.replace(Regex("\\s*\\[ID:[a-zA-Z0-9_]+]"), "")

    private companion object {
        const val TAG = "AiViewModel"
    }
}
