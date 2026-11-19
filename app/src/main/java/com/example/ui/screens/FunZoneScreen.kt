package com.example.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.CatalogRepository
import com.example.data.LocalAppPrefs
import com.example.i18n.AppStrings
import com.example.model.DailyChallenge
import com.example.model.Product
import com.example.ui.components.*
import com.example.ui.theme.LocalMyShopColors
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private enum class FunTab(val label: String) {
    SPIN("Spin & Win"),
    SCRATCH("Scratch Card"),
    STREAK("Streak"),
    CHALLENGES("Challenges"),
    BATTLE("Product Battle"),
    QUIZ("Quiz"),
    FUNNY("Funny Zone"),
    TREASURE("Treasure Hunt")
}

@Composable
fun FunZoneScreen(
    strings: AppStrings,
    prefs: LocalAppPrefs,
    activePoints: Int,
    funnyUpvotedIds: Set<String>,
    canSpinToday: Boolean,
    canScratchToday: Boolean,
    canClaimStreakToday: Boolean,
    challengeProgress: (DailyChallenge) -> Int,
    onSpinComplete: (String, Int, String?) -> Unit,
    onScratchComplete: (String, Int, String?) -> Unit,
    onClaimStreak: () -> Unit,
    onClaimChallenge: (DailyChallenge) -> Unit,
    onQuizCorrect: (Int) -> Unit,
    onToggleFunnyUpvote: (String) -> Unit,
    onDiscoverTreasure: (String, String, String, Int) -> Unit,
    onOpenProduct: (String) -> Unit
) {
    val ext = LocalMyShopColors.current
    var selectedTab by remember { mutableStateOf(FunTab.SPIN) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("fun_zone_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Banner
        item {
            GlassCard(cornerRadius = 22.dp, glowAccent = ext.gold) {
                Box(modifier = Modifier.fillMaxWidth().height(150.dp)) {
                    Image(
                        painter = painterResource(id = R.drawable.img_fun_zone_banner),
                        contentDescription = strings.funZoneTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(modifier = Modifier.fillMaxSize().background(Color(0xA6080515)))
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(strings.funZoneTitle, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.ExtraBold)
                            Surface(color = ext.gold, shape = RoundedCornerShape(12.dp)) {
                                Text(
                                    "$activePoints MY Pts",
                                    color = Color.Black,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                        Text(strings.funZoneSub, color = Color.White.copy(alpha = 0.88f), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        // Sub-Feature Selector Pills
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(FunTab.entries) { tab ->
                    FilterChip(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        label = { Text(tab.label) },
                        modifier = Modifier.testTag("fun_tab_${tab.name}")
                    )
                }
            }
        }

        // Active Fun Zone Experience
        item {
            when (selectedTab) {
                FunTab.SPIN -> SpinAndWinSection(canSpinToday, onSpinComplete)
                FunTab.SCRATCH -> ScratchAndRevealSection(canScratchToday, onScratchComplete)
                FunTab.STREAK -> ShoppingStreakSection(prefs.streakCount, canClaimStreakToday, onClaimStreak)
                FunTab.CHALLENGES -> DailyChallengesSection(prefs.claimedChallengeIds, challengeProgress, onClaimChallenge)
                FunTab.BATTLE -> ProductBattleSection(onOpenProduct)
                FunTab.QUIZ -> QuizSection(onQuizCorrect)
                FunTab.FUNNY -> FunnyZoneSection(funnyUpvotedIds, onToggleFunnyUpvote)
                FunTab.TREASURE -> TreasureHuntSection(prefs.foundTreasureIds, onDiscoverTreasure)
            }
        }
    }
}

@Composable
private fun SpinAndWinSection(
    canSpinToday: Boolean,
    onSpinComplete: (String, Int, String?) -> Unit
) {
    val ext = LocalMyShopColors.current
    val scope = rememberCoroutineScope()
    val rotation = remember { Animatable(0f) }
    var spinning by remember { mutableStateOf(false) }
    var lastPrize by remember { mutableStateOf<String?>(null) }

    val slices = listOf(
        Triple("15% OFF Coupon", 50, "SPIN15") to ext.neonPurple,
        Triple("100 MY Points", 100, null) to ext.electricBlue,
        Triple("Free Delivery Code", 30, "FREEDEL") to ext.emerald,
        Triple("75 MY Points", 75, null) to ext.hotPink,
        Triple("10% Welcome Code", 40, "MYSHOP10") to ext.gold,
        Triple("150 Bonus Points", 150, null) to Color(0xFF6366F1)
    )

    GlassCard(cornerRadius = 20.dp, glowAccent = ext.neonPurple) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Spin & Win Daily Wheel", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "Transparent Rules: 1 Free Spin per day • Zero purchase required • Coupons valid 7 days on MY Shop.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Box(modifier = Modifier.size(220.dp), contentAlignment = Alignment.Center) {
                Canvas(modifier = Modifier.size(200.dp)) {
                    val sweep = 360f / slices.size
                    rotate(rotation.value) {
                        slices.forEachIndexed { idx, (_, color) ->
                            drawArc(
                                color = color,
                                startAngle = idx * sweep,
                                sweepAngle = sweep,
                                useCenter = true,
                                size = Size(size.width, size.height)
                            )
                        }
                    }
                    drawCircle(color = Color(0xFF100B24), radius = 26f)
                }
                Icon(
                    Icons.Filled.ArrowDropDown,
                    contentDescription = "Pointer",
                    tint = ext.gold,
                    modifier = Modifier.align(Alignment.TopCenter).size(36.dp)
                )
            }

            if (lastPrize != null) {
                Surface(color = ext.emerald.copy(alpha = 0.16f), shape = RoundedCornerShape(12.dp)) {
                    Text(
                        "Won: $lastPrize",
                        color = ext.emerald,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }

            NeonGradientButton(
                text = when {
                    spinning -> "Spinning..."
                    canSpinToday -> "Spin Free Wheel"
                    else -> "Daily Spin Used (Come Back Tomorrow)"
                },
                icon = Icons.Filled.Casino,
                enabled = canSpinToday && !spinning,
                modifier = Modifier.fillMaxWidth().testTag("spin_wheel_button"),
                onClick = {
                    scope.launch {
                        spinning = true
                        val winningIdx = slices.indices.random()
                        val sweep = 360f / slices.size
                        val targetAngle = rotation.value + 1080f + (360f - winningIdx * sweep - sweep / 2f)
                        rotation.animateTo(
                            targetValue = targetAngle,
                            animationSpec = tween(durationMillis = 2200, easing = FastOutSlowInEasing)
                        )
                        val (prizeLabel, pts, code) = slices[winningIdx].first
                        lastPrize = "$prizeLabel (+$pts pts)"
                        spinning = false
                        onSpinComplete(prizeLabel, pts, code)
                    }
                }
            )
        }
    }
}

@Composable
private fun ScratchAndRevealSection(
    canScratchToday: Boolean,
    onScratchComplete: (String, Int, String?) -> Unit
) {
    val ext = LocalMyShopColors.current
    val strokes = remember { mutableStateListOf<List<Offset>>() }
    var currentStroke by remember { mutableStateOf<List<Offset>>(emptyList()) }
    var revealed by remember { mutableStateOf(!canScratchToday) }
    val rewardText = remember { "৳100 Instant Coupon (SCRATCH100) + 60 MY Pts" }

    GlassCard(cornerRadius = 20.dp, glowAccent = ext.hotPink) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Scratch & Reveal", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "1 Free promotional scratch card daily. Min spend ৳800 to apply SCRATCH100 coupon.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.linearGradient(listOf(ext.neonPurple.copy(alpha = 0.25f), ext.electricBlue.copy(alpha = 0.25f)))),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Filled.CardGiftcard, contentDescription = null, tint = ext.gold, modifier = Modifier.size(36.dp))
                    Spacer(Modifier.height(6.dp))
                    Text(rewardText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ext.gold)
                }

                if (!revealed) {
                    Canvas(
                        modifier = Modifier
                            .fillMaxSize()
                            .pointerInput(Unit) {
                                detectDragGestures(
                                    onDragStart = { pos -> currentStroke = listOf(pos) },
                                    onDrag = { change, _ ->
                                        change.consume()
                                        currentStroke = currentStroke + change.position
                                    },
                                    onDragEnd = {
                                        strokes.add(currentStroke)
                                        currentStroke = emptyList()
                                        if (strokes.sumOf { it.size } > 18 && !revealed) {
                                            revealed = true
                                            onScratchComplete("Scratch & Reveal ৳100 Off", 60, "SCRATCH100")
                                        }
                                    }
                                )
                            }
                    ) {
                        drawRect(
                            brush = Brush.linearGradient(listOf(Color(0xFF4C1D95), Color(0xFF1E3A8A)))
                        )
                        val all = strokes + listOf(currentStroke)
                        all.forEach { pts ->
                            for (i in 0 until pts.size - 1) {
                                drawLine(
                                    color = ext.electricBlue.copy(alpha = 0.85f),
                                    start = pts[i],
                                    end = pts[i + 1],
                                    strokeWidth = 34f,
                                    cap = StrokeCap.Round
                                )
                            }
                        }
                    }
                    Text(
                        "Drag finger here to scratch!",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            if (!revealed) {
                OutlinedButton(
                    onClick = {
                        revealed = true
                        onScratchComplete("Scratch & Reveal ৳100 Off", 60, "SCRATCH100")
                    },
                    modifier = Modifier.testTag("scratch_reveal_button")
                ) {
                    Text("Quick Reveal Card")
                }
            }
        }
    }
}

@Composable
private fun ShoppingStreakSection(
    streakCount: Int,
    canClaimToday: Boolean,
    onClaimStreak: () -> Unit
) {
    val ext = LocalMyShopColors.current
    GlassCard(cornerRadius = 20.dp, glowAccent = ext.emerald) {
        Column(modifier = Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("7-Day Shopping Streak", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Return daily to unlock escalating MY Loyalty Points!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                (1..7).forEach { day ->
                    val completed = day <= streakCount
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(if (completed) ext.emerald else MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("D$day", color = if (completed) Color.Black else MaterialTheme.colorScheme.onSurface, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("+${day * 25}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            NeonGradientButton(
                text = if (canClaimToday) "Claim Today's Streak Bonus" else "Today's Streak Claimed",
                icon = Icons.Filled.LocalFireDepartment,
                enabled = canClaimToday,
                onClick = onClaimStreak,
                modifier = Modifier.fillMaxWidth().testTag("claim_streak_button")
            )
        }
    }
}

@Composable
private fun DailyChallengesSection(
    claimedIds: Set<String>,
    progressProvider: (DailyChallenge) -> Int,
    onClaim: (DailyChallenge) -> Unit
) {
    val ext = LocalMyShopColors.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        CatalogRepository.dailyChallenges.forEach { ch ->
            val progress = progressProvider(ch).coerceAtMost(ch.requiredCount)
            val claimed = claimedIds.contains(ch.id)
            val ready = progress >= ch.requiredCount && !claimed
            GlassCard(cornerRadius = 16.dp) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(ch.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(ch.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = { progress.toFloat() / ch.requiredCount.toFloat() },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(4.dp)),
                            color = ext.electricBlue
                        )
                        Text("$progress / ${ch.requiredCount} • Reward: +${ch.rewardPoints} pts", style = MaterialTheme.typography.labelSmall, color = ext.gold)
                    }
                    Spacer(Modifier.width(10.dp))
                    Button(
                        onClick = { onClaim(ch) },
                        enabled = ready
                    ) {
                        Text(if (claimed) "Claimed" else if (ready) "Claim" else "In Progress")
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductBattleSection(onOpenProduct: (String) -> Unit) {
    val ext = LocalMyShopColors.current
    val candidates = remember { CatalogRepository.products.take(8) }
    var leftIdx by remember { mutableIntStateOf(0) }
    var rightIdx by remember { mutableIntStateOf(2) }
    var votedId by remember { mutableStateOf<String?>(null) }

    val left = candidates[leftIdx]
    val right = candidates[rightIdx]

    GlassCard(cornerRadius = 20.dp, glowAccent = ext.electricBlue) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Product Battle Arena", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BattleFighterCard(left, votedId == left.id, Modifier.weight(1f), { leftIdx = (leftIdx + 1) % candidates.size }, { votedId = left.id }, { onOpenProduct(left.id) })
                BattleFighterCard(right, votedId == right.id, Modifier.weight(1f), { rightIdx = (rightIdx + 1) % candidates.size }, { votedId = right.id }, { onOpenProduct(right.id) })
            }
            HorizontalDivider()
            BattleStatRow("Price", formatBdt(left.price), formatBdt(right.price))
            BattleStatRow("Discount", "${left.discountPercent}%", "${right.discountPercent}%")
            BattleStatRow("Rating", "${left.rating}★", "${right.rating}★")
            BattleStatRow("Stock", "${left.stock}", "${right.stock}")
            if (votedId != null) {
                val winner = if (votedId == left.id) left.name else right.name
                Text("Crowd Pick Winner: $winner!", color = ext.emerald, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun BattleFighterCard(
    product: Product,
    isVoted: Boolean,
    modifier: Modifier,
    onSwap: () -> Unit,
    onVote: () -> Unit,
    onOpen: () -> Unit
) {
    val ext = LocalMyShopColors.current
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = if (isVoted) BorderStroke(2.dp, ext.emerald) else null
    ) {
        Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ProductVisualArt(product, modifier = Modifier.fillMaxWidth().height(74.dp).clip(RoundedCornerShape(10.dp)).clickable(onClick = onOpen), iconSize = 32.dp)
            Text(product.name, style = MaterialTheme.typography.labelMedium, maxLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                OutlinedButton(onClick = onSwap, contentPadding = PaddingValues(horizontal = 8.dp), modifier = Modifier.height(32.dp)) {
                    Text("Swap", style = MaterialTheme.typography.labelSmall)
                }
                Button(onClick = onVote, contentPadding = PaddingValues(horizontal = 8.dp), modifier = Modifier.height(32.dp)) {
                    Text(if (isVoted) "Voted" else "Vote", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun BattleStatRow(label: String, leftVal: String, rightVal: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(leftVal, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(rightVal, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun QuizSection(onQuizCorrect: (Int) -> Unit) {
    val ext = LocalMyShopColors.current
    var qIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableStateOf<Int?>(null) }
    val question = CatalogRepository.quizQuestions[qIndex]

    GlassCard(cornerRadius = 20.dp, glowAccent = ext.neonPurple) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("MY Shop Trivia Quiz (${qIndex + 1}/${CatalogRepository.quizQuestions.size})", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(question.question, style = MaterialTheme.typography.titleMedium)
            question.options.forEachIndexed { idx, opt ->
                val isSelected = selectedOption == idx
                val isCorrect = idx == question.correctIndex
                val bg = when {
                    selectedOption == null -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    isCorrect -> ext.emerald.copy(alpha = 0.25f)
                    isSelected -> MaterialTheme.colorScheme.error.copy(alpha = 0.25f)
                    else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                }
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(enabled = selectedOption == null) {
                            selectedOption = idx
                            if (idx == question.correctIndex) onQuizCorrect(35)
                        },
                    color = bg,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(opt, modifier = Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (selectedOption != null) {
                Text(question.explanation, style = MaterialTheme.typography.bodySmall, color = ext.electricBlue)
                Button(onClick = {
                    selectedOption = null
                    qIndex = (qIndex + 1) % CatalogRepository.quizQuestions.size
                }) { Text("Next Question") }
            }
        }
    }
}

@Composable
private fun FunnyZoneSection(
    upvotedIds: Set<String>,
    onToggleUpvote: (String) -> Unit
) {
    val ext = LocalMyShopColors.current
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        CatalogRepository.funnyCards.forEach { card ->
            val liked = upvotedIds.contains(card.id)
            GlassCard(cornerRadius = 18.dp, glowAccent = ext.hotPink) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(card.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Surface(color = ext.hotPink.copy(alpha = 0.2f), shape = RoundedCornerShape(8.dp)) {
                            Text(card.fakeTagPrice, color = ext.hotPink, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                    Text(card.joke, style = MaterialTheme.typography.bodyMedium)
                    Text(card.punchline, style = MaterialTheme.typography.bodySmall, color = ext.electricBlue)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        FilledTonalButton(onClick = { onToggleUpvote(card.id) }) {
                            Icon(Icons.Filled.SentimentVerySatisfied, contentDescription = "Laugh", modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("${card.initialLaughs + (if (liked) 1 else 0)} Haha")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TreasureHuntSection(
    foundIds: Set<String>,
    onDiscoverTreasure: (String, String, String, Int) -> Unit
) {
    val ext = LocalMyShopColors.current
    GlassCard(cornerRadius = 20.dp, glowAccent = ext.gold) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Shopping Treasure Hunt (${foundIds.size}/3 Found)", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "Discover hidden glowing treasure chests across Home, Explore, and Product Detail pages to unlock ৳250 coupons & 100 MY Points each!",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            listOf(
                Triple("treasure_home", "Chest #1: Home Page Cyber Vault", foundIds.contains("treasure_home")),
                Triple("treasure_explore", "Chest #2: Explore Grid Secret", foundIds.contains("treasure_explore")),
                Triple("treasure_detail", "Chest #3: Product Detail Inspector", foundIds.contains("treasure_detail"))
            ).forEach { (id, label, found) ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (found) Icons.Filled.CheckCircle else Icons.Outlined.Lock,
                            contentDescription = null,
                            tint = if (found) ext.emerald else ext.gold
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(label, style = MaterialTheme.typography.bodyMedium)
                    }
                    Text(if (found) "Claimed" else "Hidden", style = MaterialTheme.typography.labelSmall, color = if (found) ext.emerald else ext.gold)
                }
            }
            if (!foundIds.contains("treasure_funzone")) {
                TreasureChestBadge(
                    treasureId = "treasure_funzone",
                    alreadyFound = false,
                    label = "Bonus Arcade Chest!",
                    onDiscover = { onDiscoverTreasure("treasure_funzone", "Arcade Bonus Treasure", "HUNTFUN", 100) }
                )
            }
        }
    }
}
