package com.example.ui.screens

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.i18n.AppStrings
import com.example.model.Product
import com.example.ui.components.GlassCard
import com.example.ui.components.ProductVisualArt
import com.example.ui.components.formatBdt
import com.example.ui.theme.LocalMyShopColors
import com.example.viewmodel.AiChatMessage
import com.example.viewmodel.AiUiState

@Composable
fun AiAssistantScreen(
    strings: AppStrings,
    messages: List<AiChatMessage>,
    uiState: AiUiState,
    onSendPrompt: (String) -> Unit,
    onAnalyzePhoto: (Bitmap, String) -> Unit,
    onOpenProduct: (String) -> Unit,
    onAddToCart: (Product) -> Unit
) {
    val context = LocalContext.current
    val ext = LocalMyShopColors.current
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    val quickPrompts = remember {
        listOf(
            "Find me a good phone under ৳20,000",
            "Show the best gaming headphones",
            "Compare AeroBook Pro 14 vs CyberEdge RTX 4060",
            "Find products with free delivery",
            "Recommend a gift under ৳4,000"
        )
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            val bitmap = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val source = ImageDecoder.createSource(context.contentResolver, uri)
                    ImageDecoder.decodeBitmap(source)
                } else {
                    @Suppress("DEPRECATION")
                    MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
                }
            } catch (_: Exception) {
                null
            }
            if (bitmap != null) {
                val scaled = Bitmap.createScaledBitmap(bitmap, 768, (768f * bitmap.height / bitmap.width.coerceAtLeast(1)).toInt().coerceAtLeast(256), true)
                onAnalyzePhoto(scaled, inputText)
                inputText = ""
            }
        }
    }

    LaunchedEffect(messages.size, messages.lastOrNull()?.text) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("ai_assistant_screen")
    ) {
        // AI Header Card
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            cornerRadius = 18.dp,
            glowAccent = ext.electricBlue
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(
                    painter = painterResource(id = R.drawable.img_ai_assistant_avatar),
                    contentDescription = "MY AI Avatar",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(46.dp).clip(CircleShape)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(strings.aiAssistantTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Powered by Gemini • Recommends only live MY Shop inventory",
                        style = MaterialTheme.typography.bodySmall,
                        color = ext.electricBlue
                    )
                }
                if (uiState is AiUiState.Thinking) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = ext.electricBlue)
                }
            }
        }

        // Quick Action Prompts
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(quickPrompts) { prompt ->
                SuggestionChip(
                    onClick = { onSendPrompt(prompt) },
                    label = { Text(prompt, style = MaterialTheme.typography.bodySmall) },
                    icon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null, modifier = Modifier.size(14.dp), tint = ext.neonPurple) }
                )
            }
        }

        // Messages Thread
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(messages, key = { it.id }) { msg ->
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (msg.isUser) Alignment.End else Alignment.Start
                ) {
                    Surface(
                        shape = RoundedCornerShape(
                            topStart = 18.dp,
                            topEnd = 18.dp,
                            bottomStart = if (msg.isUser) 18.dp else 4.dp,
                            bottomEnd = if (msg.isUser) 4.dp else 18.dp
                        ),
                        color = if (msg.isUser) MaterialTheme.colorScheme.primaryContainer else ext.glassBackground,
                        modifier = Modifier.widthIn(max = 320.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = if (msg.text.isEmpty() && msg.isStreaming) "Searching MY Shop catalog..." else msg.text,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (msg.isUser) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    if (msg.recommendedProducts.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(msg.recommendedProducts, key = { "${msg.id}_${it.id}" }) { prod ->
                                GlassCard(
                                    modifier = Modifier.width(215.dp),
                                    cornerRadius = 14.dp,
                                    glowAccent = prod.accentColor,
                                    onClick = { onOpenProduct(prod.id) }
                                ) {
                                    Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        ProductVisualArt(prod, modifier = Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)), iconSize = 24.dp)
                                        Spacer(Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(prod.name, style = MaterialTheme.typography.labelMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                            Text(formatBdt(prod.price), style = MaterialTheme.typography.labelLarge, color = ext.electricBlue, fontWeight = FontWeight.Bold)
                                            Text("Stock: ${prod.stock}", style = MaterialTheme.typography.bodySmall, color = ext.emerald)
                                        }
                                        IconButton(onClick = { onAddToCart(prod) }) {
                                            Icon(Icons.Outlined.AddShoppingCart, contentDescription = "Add to Cart", tint = ext.neonPurple)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Input Composer + Zero-Permission Photo Picker Visual Search
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(
                onClick = {
                    photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(ext.glassBackground)
                    .testTag("ai_photo_picker")
            ) {
                Icon(Icons.Outlined.AddPhotoAlternate, contentDescription = "Visual Search Photo", tint = ext.electricBlue)
            }

            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                placeholder = { Text("Ask MY AI anything...") },
                singleLine = true,
                shape = RoundedCornerShape(22.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("ai_chat_input")
            )

            FilledIconButton(
                onClick = {
                    if (inputText.isNotBlank()) {
                        onSendPrompt(inputText)
                        inputText = ""
                    }
                },
                enabled = uiState !is AiUiState.Thinking,
                modifier = Modifier
                    .size(48.dp)
                    .testTag("ai_send_button")
            ) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
            }
        }
    }
}
