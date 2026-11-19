package com.example.data

import androidx.compose.ui.graphics.Color
import com.example.model.*

object CatalogRepository {

    val categories: List<Category> = listOf(
        Category(CategoryId.MOBILES, Color(0xFF8B5CF6), Color(0xFF00D4FF), "5G & AI"),
        Category(CategoryId.COMPUTERS, Color(0xFF3B82F6), Color(0xFF22D3EE), "PRO"),
        Category(CategoryId.ELECTRONICS, Color(0xFFEC4899), Color(0xFF8B5CF6), "HOT"),
        Category(CategoryId.FASHION, Color(0xFFF43F5E), Color(0xFFFB7185), "NEW"),
        Category(CategoryId.SHOES, Color(0xFF06B6D4), Color(0xFF3B82F6), "DROP"),
        Category(CategoryId.BEAUTY, Color(0xFFD946EF), Color(0xFFF472B6), "GLOW"),
        Category(CategoryId.HOME_LIVING, Color(0xFF10B981), Color(0xFF06B6D4), "COZY"),
        Category(CategoryId.FURNITURE, Color(0xFFF59E0B), Color(0xFFEF4444), "CRAFT"),
        Category(CategoryId.TOYS, Color(0xFFA855F7), Color(0xFFF43F5E), "FUN"),
        Category(CategoryId.SPORTS, Color(0xFF14B8A6), Color(0xFF3B82F6), "FIT"),
        Category(CategoryId.BOOKS, Color(0xFF6366F1), Color(0xFFA855F7), "READ"),
        Category(CategoryId.GROCERY, Color(0xFF22C55E), Color(0xFF10B981), "FRESH"),
        Category(CategoryId.BABY, Color(0xFFF472B6), Color(0xFF38BDF8), "CARE"),
        Category(CategoryId.ACCESSORIES, Color(0xFFEAB308), Color(0xFFA855F7), "STYLE"),
        Category(CategoryId.GAMING, Color(0xFFFF2E93), Color(0xFF00D4FF), "RGB"),
        Category(CategoryId.AUTOMOTIVE, Color(0xFF64748B), Color(0xFF38BDF8), "DRIVE")
    )

    val brands: List<BrandInfo> = listOf(
        BrandInfo("NovaTech", "Next-Gen Mobiles", Color(0xFF8B5CF6)),
        BrandInfo("AeroCore", "Pro Computing", Color(0xFF00D4FF)),
        BrandInfo("SonicWave", "Studio Audio", Color(0xFFFF2E93)),
        BrandInfo("StrideX", "Urban Footwear", Color(0xFF10B981)),
        BrandInfo("Lumina", "Clean Beauty", Color(0xFFD946EF)),
        BrandInfo("VeloGear", "RGB Gaming", Color(0xFF6366F1)),
        BrandInfo("NordicNest", "Smart Living", Color(0xFFF59E0B)),
        BrandInfo("Kinetix", "Active Fitness", Color(0xFF14B8A6))
    )

    val builtInCoupons: List<CouponRule> = listOf(
        CouponRule("MYSHOP10", "Welcome 10% Off (Orders ৳1,000+)", "PERCENT", 10.0, 1000.0, "Valid Anytime"),
        CouponRule("FLASH200", "৳200 Instant Cashback (Orders ৳2,500+)", "FIXED", 200.0, 2500.0, "Flash Deal"),
        CouponRule("FREEDEL", "100% Free Express Delivery", "FREE_DELIVERY", 0.0, 500.0, "Limited Offer")
    )

    val paymentMethods: List<PaymentMethodOption> = listOf(
        PaymentMethodOption("bKash", "bKash", "Instant mobile wallet (Sandbox Gateway)", PaymentRegion.BANGLADESH),
        PaymentMethodOption("Nagad", "Nagad", "Fast digital payment (Sandbox Gateway)", PaymentRegion.BANGLADESH),
        PaymentMethodOption("Rocket", "Rocket", "DBBL mobile banking (Sandbox Gateway)", PaymentRegion.BANGLADESH),
        PaymentMethodOption("Local Card", "BD Debit / Credit Card", "NexusPay & local bank cards (Sandbox)", PaymentRegion.BANGLADESH),
        PaymentMethodOption("Cash on Delivery", "Cash on Delivery", "Pay cash upon doorstep inspection", PaymentRegion.BANGLADESH, supportsSandboxGateway = false),
        PaymentMethodOption("Visa", "Visa International", "3DS Verified Gateway (Sandbox)", PaymentRegion.INTERNATIONAL),
        PaymentMethodOption("Mastercard", "Mastercard Global", "Secure Card Gateway (Sandbox)", PaymentRegion.INTERNATIONAL),
        PaymentMethodOption("PayPal", "PayPal Express", "Configured Sandbox Merchant Mode", PaymentRegion.INTERNATIONAL)
    )

    val products: List<Product> = listOf(
        // 1. MOBILES & TABLETS
        Product(
            id = "p_mob_1",
            name = "NovaPulse 5G (8GB/256GB)",
            nameBn = "নোভা-পালস 5G (৮/২৫৬ জিবি)",
            brand = "NovaTech",
            category = CategoryId.MOBILES,
            price = 18990.0,
            originalPrice = 22990.0,
            stock = 18,
            rating = 4.8,
            reviewCount = 342,
            description = "6.7-inch 120Hz AMOLED display, Dimensity 5G processor, 50MP OIS night camera, and 5000mAh 67W turbo charge — engineered as the value king under ৳20,000.",
            colors = listOf("Cosmic Violet", "Electric Cyan", "Obsidian Black"),
            sizes = listOf("8GB / 128GB", "8GB / 256GB"),
            specs = listOf(
                ProductSpec("Display", "6.7\" FHD+ 120Hz AMOLED"),
                ProductSpec("Camera", "50MP OIS + 8MP Ultra-Wide"),
                ProductSpec("Battery", "5000mAh • 67W Fast Charge"),
                ProductSpec("Network", "Dual 5G SA/NSA + Wi-Fi 6")
            ),
            seller = SellerInfo("NovaTech Official BD", 4.9, "Dhaka Hub"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            flashSale = true,
            todaysDeal = true,
            trending = true,
            featured = true,
            bestSeller = true,
            accentColor = Color(0xFF8B5CF6),
            secondaryColor = Color(0xFF00D4FF),
            imageViews = listOf("Front AMOLED View", "Triple OIS Camera", "Slim 7.6mm Frame"),
            reviews = listOf(
                ProductReview("r1", "Tanvir Ahmed", 5, "Best 5G phone under ৳20,000! Display is super bright in sunlight.", "2 days ago"),
                ProductReview("r2", "Nusrat Jahan", 5, "67W charger takes it from 10% to 100% in ~42 mins. Camera OIS is crisp.", "5 days ago")
            ),
            qaList = listOf(
                ProductQA("q1", "Does it come with the 67W charger in the box?", "Yes! Original 67W adapter, USB-C cable, and clear case are included.", "Rafiq I."),
                ProductQA("q2", "Is it official BD warranty?", "Yes, 12-month official NovaTech Bangladesh warranty.", "Sadia K.")
            ),
            relatedIds = listOf("p_mob_2", "p_acc_1", "p_elec_1"),
            frequentlyBoughtIds = listOf("p_acc_1", "p_elec_1")
        ),
        Product(
            id = "p_mob_2",
            name = "ApexTab Ultra 11\" Studio Tablet",
            nameBn = "এপেক্সট্যাব আল্ট্রা ১১\" স্টুডিও ট্যাবলেট",
            brand = "NovaTech",
            category = CategoryId.MOBILES,
            price = 28500.0,
            originalPrice = 32000.0,
            stock = 11,
            rating = 4.7,
            reviewCount = 128,
            description = "2.5K 120Hz stylus-ready slate with quad Dolby speakers, aluminum unibody, and all-day 8600mAh battery for study, sketching, and streaming.",
            colors = listOf("Space Gray", "Aurora Blue"),
            sizes = listOf("128GB Wi-Fi", "256GB LTE"),
            specs = listOf(
                ProductSpec("Display", "11\" 2.5K IPS 120Hz"),
                ProductSpec("Audio", "Quad Stereo Dolby Atmos"),
                ProductSpec("Stylus", "4096-level Low Latency Pen Ready")
            ),
            seller = SellerInfo("NovaTech Official BD", 4.9, "Dhaka Hub"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            featured = true,
            newArrival = true,
            accentColor = Color(0xFF00D4FF),
            secondaryColor = Color(0xFF6D28D9),
            imageViews = listOf("Studio Landscape", "Magnetic Stylus Dock", "Quad Speaker Rim"),
            reviews = listOf(ProductReview("r3", "Mahmudul Hasan", 5, "Great for university PDF annotations and Netflix.", "1 week ago")),
            qaList = listOf(ProductQA("q3", "Does it support keyboard folio?", "Yes, pogo-pin magnetic keyboard supported.", "Farhan")),
            relatedIds = listOf("p_mob_1", "p_comp_1"),
            frequentlyBoughtIds = listOf("p_acc_1")
        ),

        // 2. COMPUTERS & LAPTOPS
        Product(
            id = "p_comp_1",
            name = "AeroBook Pro 14 OLED (16GB/512GB)",
            nameBn = "এরোবুক প্রো ১৪ ওলেড ল্যাপটপ",
            brand = "AeroCore",
            category = CategoryId.COMPUTERS,
            price = 74900.0,
            originalPrice = 84900.0,
            stock = 7,
            rating = 4.9,
            reviewCount = 215,
            description = "Featherlight 1.28kg magnesium-alloy ultrabook with 2.8K 90Hz OLED display, Ryzen 7 AI processor, 16GB LPDDR5X RAM, and 14-hour battery.",
            colors = listOf("Midnight Ink", "Starlight Silver"),
            sizes = listOf("16GB / 512GB", "32GB / 1TB"),
            specs = listOf(
                ProductSpec("Processor", "8-Core AI Ryzen 7 Series"),
                ProductSpec("Screen", "14\" 2.8K OLED 100% DCI-P3"),
                ProductSpec("Memory", "16GB LPDDR5X + Gen4 NVMe SSD"),
                ProductSpec("Weight", "1.28 kg • USB4 + HDMI 2.1")
            ),
            seller = SellerInfo("AeroCore Flagship", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            featured = true,
            bestSeller = true,
            trending = true,
            accentColor = Color(0xFF3B82F6),
            secondaryColor = Color(0xFF00D4FF),
            imageViews = listOf("OLED Open Deck", "Ultra-Thin Profile", "Backlit Keyboard"),
            reviews = listOf(ProductReview("r4", "Shafqat Karim", 5, "That OLED screen makes coding and photo editing a dream.", "3 days ago")),
            qaList = listOf(ProductQA("q4", "Can RAM be upgraded later?", "16GB is dual-channel onboard; SSD is user-upgradable.", "Zayed")),
            relatedIds = listOf("p_comp_2", "p_gam_1", "p_acc_2"),
            frequentlyBoughtIds = listOf("p_acc_2", "p_elec_1")
        ),
        Product(
            id = "p_comp_2",
            name = "CyberEdge Gaming Laptop RTX 4060",
            nameBn = "সাইবারএজ গেমিং ল্যাপটপ RTX 4060",
            brand = "AeroCore",
            category = CategoryId.COMPUTERS,
            price = 119500.0,
            originalPrice = 132000.0,
            stock = 5,
            rating = 4.8,
            reviewCount = 94,
            description = "15.6-inch 165Hz QHD gaming powerhouse with RTX 4060 8GB, dual vapor-chamber cooling, and per-key RGB mechanical feel keyboard.",
            colors = listOf("Stealth Carbon"),
            sizes = listOf("16GB / 1TB SSD"),
            specs = listOf(
                ProductSpec("GPU", "NVIDIA GeForce RTX 4060 8GB"),
                ProductSpec("Display", "15.6\" QHD 165Hz G-Sync"),
                ProductSpec("Cooling", "Dual CryoBlade 3D Fans")
            ),
            seller = SellerInfo("AeroCore Flagship", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            todaysDeal = true,
            accentColor = Color(0xFFFF2E93),
            secondaryColor = Color(0xFF3B82F6),
            imageViews = listOf("RGB Deck", "Rear Exhaust Vents", "165Hz Bezel"),
            reviews = listOf(ProductReview("r5", "Abrar Chowdhury", 5, "Runs Cyberpunk & Valorant ultra smooth with cool thermals.", "6 days ago")),
            qaList = emptyList(),
            relatedIds = listOf("p_comp_1", "p_gam_1", "p_elec_1"),
            frequentlyBoughtIds = listOf("p_gam_1")
        ),

        // 3. ELECTRONICS
        Product(
            id = "p_elec_1",
            name = "SonicWave Aurora ANC Wireless Headphones",
            nameBn = "সনিকওয়েভ অরোরা ANC ওয়্যারলেস হেডফোন",
            brand = "SonicWave",
            category = CategoryId.ELECTRONICS,
            price = 4990.0,
            originalPrice = 6990.0,
            stock = 32,
            rating = 4.9,
            reviewCount = 510,
            description = "45dB Hybrid Active Noise Cancellation, Hi-Res LDAC audio, spatial gaming mode (45ms ultra-low latency), and 60-hour battery life.",
            colors = listOf("Neon Violet", "Glacier White", "Matte Black"),
            sizes = listOf("Standard Fit"),
            specs = listOf(
                ProductSpec("ANC", "-45dB Hybrid Multi-Mic"),
                ProductSpec("Battery", "60 Hours • 10min = 6h Fast Charge"),
                ProductSpec("Bluetooth", "v5.4 Multipoint + USB-C Audio")
            ),
            seller = SellerInfo("SonicWave Audio BD", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            flashSale = true,
            trending = true,
            bestSeller = true,
            accentColor = Color(0xFFEC4899),
            secondaryColor = Color(0xFF8B5CF6),
            imageViews = listOf("Studio Hero", "Memory Foam Cups", "Foldable Travel Case"),
            reviews = listOf(ProductReview("r6", "Raisa Tabassum", 5, "Noise cancellation blocks Dhaka traffic completely!", "1 day ago")),
            qaList = listOf(ProductQA("q5", "Good for competitive gaming?", "Yes, turn on Low-Latency Gaming mode (45ms) or plug USB-C.", "Imran")),
            relatedIds = listOf("p_gam_1", "p_mob_1"),
            frequentlyBoughtIds = listOf("p_acc_1")
        ),
        Product(
            id = "p_elec_2",
            name = "LumenCast 4K Smart Mini Projector",
            nameBn = "লুমেনকাস্ট ৪কে স্মার্ট মিনি প্রজেক্টর",
            brand = "SonicWave",
            category = CategoryId.ELECTRONICS,
            price = 14500.0,
            originalPrice = 17900.0,
            stock = 9,
            rating = 4.6,
            reviewCount = 76,
            description = "Turn any wall into a 150-inch cinema! Auto-keystone correction, Wi-Fi 6 screen mirroring, built-in Hi-Fi speaker.",
            colors = listOf("Midnight Purple"),
            sizes = listOf("1080p Native / 4K Input"),
            specs = listOf(
                ProductSpec("Brightness", "650 ANSI Lumens"),
                ProductSpec("Throw Size", "40\" to 150\" Auto-Focus")
            ),
            seller = SellerInfo("SonicWave Audio BD", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 2,
            deliveryDaysMax = 3,
            newArrival = true,
            accentColor = Color(0xFFA855F7),
            secondaryColor = Color(0xFF00D4FF),
            imageViews = listOf("Cinema Lens", "360 Gimbal Stand"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_elec_1", "p_home_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 4. FASHION & CLOTHING
        Product(
            id = "p_fash_1",
            name = "Nebula Oversized Tech-Fleece Hoodie",
            nameBn = "নেবুলা ওভারসাইজড টেক-ফ্লিস হুডি",
            brand = "StrideX",
            category = CategoryId.FASHION,
            price = 1690.0,
            originalPrice = 2490.0,
            stock = 44,
            rating = 4.7,
            reviewCount = 198,
            description = "380GSM heavyweight brushed organic cotton fleece with reflective cyber piping and concealed zip phone pocket.",
            colors = listOf("Obsidian Black", "Lilac Mist", "Electric Cobalt"),
            sizes = listOf("M", "L", "XL", "XXL"),
            specs = listOf(
                ProductSpec("Fabric", "380GSM 85% Cotton / 15% Poly"),
                ProductSpec("Fit", "Dropped-shoulder Streetwear")
            ),
            seller = SellerInfo("StrideX Apparel", 4.8, "Chattogram"),
            freeDelivery = false,
            deliveryDaysMin = 2,
            deliveryDaysMax = 4,
            trending = true,
            todaysDeal = true,
            accentColor = Color(0xFFF43F5E),
            secondaryColor = Color(0xFFA855F7),
            imageViews = listOf("Front Street Fit", "Reflective Seam Detail"),
            reviews = listOf(ProductReview("r7", "Siam Hossain", 5, "Thick premium fabric and stitching is immaculate.", "4 days ago")),
            qaList = emptyList(),
            relatedIds = listOf("p_shoe_1", "p_acc_1"),
            frequentlyBoughtIds = listOf("p_shoe_1")
        ),

        // 5. SHOES
        Product(
            id = "p_shoe_1",
            name = "StrideX AirPulse Nitro Runners",
            nameBn = "স্ট্রাইডএক্স এয়ারপালস নাইট্রো রানিং জুতা",
            brand = "StrideX",
            category = CategoryId.SHOES,
            price = 3290.0,
            originalPrice = 4490.0,
            stock = 21,
            rating = 4.8,
            reviewCount = 264,
            description = "Breathable engineered knit upper with nitrogen-infused cloud midsole for effortless daily runs and street style.",
            colors = listOf("Cyber Pink/Black", "Volt Blue", "Triple White"),
            sizes = listOf("40", "41", "42", "43", "44"),
            specs = listOf(
                ProductSpec("Midsole", "NitroFoam High-Rebound"),
                ProductSpec("Weight", "235g (Size 42)")
            ),
            seller = SellerInfo("StrideX Official", 4.8, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            flashSale = true,
            bestSeller = true,
            accentColor = Color(0xFF06B6D4),
            secondaryColor = Color(0xFFFF2E93),
            imageViews = listOf("Side Profile", "Outsole Grip"),
            reviews = listOf(ProductReview("r8", "Nabil Islam", 5, "Super lightweight and comfy even after 10k steps.", "2 days ago")),
            qaList = emptyList(),
            relatedIds = listOf("p_fash_1", "p_sport_1"),
            frequentlyBoughtIds = listOf("p_fash_1")
        ),

        // 6. BEAUTY & PERSONAL CARE
        Product(
            id = "p_beau_1",
            name = "Lumina Glass-Skin Hyaluronic Glow Serum",
            nameBn = "লুমিনা গ্লাস-স্কিন হায়ালুরনিক গ্লো সিরাম",
            brand = "Lumina",
            category = CategoryId.BEAUTY,
            price = 1150.0,
            originalPrice = 1550.0,
            stock = 52,
            rating = 4.9,
            reviewCount = 412,
            description = "Triple-weight Hyaluronic Acid + 5% Niacinamide + Korean Centella for instant dewy hydration without stickiness.",
            colors = listOf("30ml Dropper"),
            sizes = listOf("30ml", "50ml"),
            specs = listOf(
                ProductSpec("Key Actives", "2% HA + 5% Niacinamide"),
                ProductSpec("Skin Type", "All Skin Types • Fragrance-Free")
            ),
            seller = SellerInfo("Lumina Derm Care", 4.9, "Dhaka"),
            freeDelivery = false,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            bestSeller = true,
            featured = true,
            accentColor = Color(0xFFD946EF),
            secondaryColor = Color(0xFFF472B6),
            imageViews = listOf("Crystal Dropper", "Texture Swatch"),
            reviews = listOf(ProductReview("r9", "Farhana Yasmin", 5, "Authentic Korean formula! My skin looks hydrated all day.", "3 days ago")),
            qaList = emptyList(),
            relatedIds = listOf("p_fash_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 7. HOME & LIVING
        Product(
            id = "p_home_1",
            name = "NordicNest Smart Aurora Ambient Lamp",
            nameBn = "নর্ডিকনেস্ট স্মার্ট অরোরা অ্যাম্বিয়েন্ট ল্যাম্প",
            brand = "NordicNest",
            category = CategoryId.HOME_LIVING,
            price = 2190.0,
            originalPrice = 2890.0,
            stock = 26,
            rating = 4.7,
            reviewCount = 154,
            description = "16M RGBIC ambient desk & bedside lamp with music-sync microphone, sunrise wake timer, and app/touch dimming.",
            colors = listOf("Frosted Pearl"),
            sizes = listOf("Standard USB-C"),
            specs = listOf(
                ProductSpec("Lighting", "16 Million RGBIC + Warm 2700K"),
                ProductSpec("Control", "Touch Ring + Music Sync")
            ),
            seller = SellerInfo("NordicNest Living", 4.8, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            newArrival = true,
            todaysDeal = true,
            accentColor = Color(0xFF10B981),
            secondaryColor = Color(0xFF00D4FF),
            imageViews = listOf("Aurora Glow Mode", "Touch Top Control"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_furn_1", "p_elec_2"),
            frequentlyBoughtIds = emptyList()
        ),

        // 8. FURNITURE
        Product(
            id = "p_furn_1",
            name = "NordicNest ErgoMesh Pro Desk Chair",
            nameBn = "নর্ডিকনেস্ট এরগোমেশ প্রো ডেস্ক চেয়ার",
            brand = "NordicNest",
            category = CategoryId.FURNITURE,
            price = 12900.0,
            originalPrice = 15900.0,
            stock = 8,
            rating = 4.8,
            reviewCount = 87,
            description = "Breathable Korean mesh ergonomic chair with adaptive 3D lumbar support, 135° recline lock, and adjustable headrest.",
            colors = listOf("Obsidian Mesh", "Slate Gray"),
            sizes = listOf("Standard Assembly"),
            specs = listOf(
                ProductSpec("Support", "Adaptive 3D Lumbar + Headrest"),
                ProductSpec("Weight Cap", "135 kg • Class-4 Gas Lift")
            ),
            seller = SellerInfo("NordicNest Living", 4.8, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 2,
            deliveryDaysMax = 4,
            featured = true,
            accentColor = Color(0xFFF59E0B),
            secondaryColor = Color(0xFF8B5CF6),
            imageViews = listOf("Full Ergonomic View", "Lumbar Pivot"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_home_1", "p_comp_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 9. TOYS & GAMES
        Product(
            id = "p_toy_1",
            name = "AstroBot Programmable STEM Drone Kit",
            nameBn = "অ্যাস্ট্রোবট প্রোগ্রামেবল STEM ড্রোন কিট",
            brand = "VeloGear",
            category = CategoryId.TOYS,
            price = 3750.0,
            originalPrice = 4500.0,
            stock = 16,
            rating = 4.6,
            reviewCount = 63,
            description = "Safe caged mini-drone with 360° flips, altitude hold, and beginner block-coding mode for curious young builders.",
            colors = listOf("Neon Cyan", "Solar Orange"),
            sizes = listOf("2 Batteries Included"),
            specs = listOf(
                ProductSpec("Flight Time", "24 mins total (2 Batteries)"),
                ProductSpec("Age", "8+ Years • Propeller Guards")
            ),
            seller = SellerInfo("PlayVerse BD", 4.7, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 2,
            deliveryDaysMax = 3,
            newArrival = true,
            accentColor = Color(0xFFA855F7),
            secondaryColor = Color(0xFFF43F5E),
            imageViews = listOf("Flight Ready", "Controller Kit"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_gam_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 10. SPORTS & FITNESS
        Product(
            id = "p_sport_1",
            name = "Kinetix Smart Jump Rope & Core Mat Bundle",
            nameBn = "কাইনেটিক্স স্মার্ট জাম্প রোপ ও ম্যাট বান্ডেল",
            brand = "Kinetix",
            category = CategoryId.SPORTS,
            price = 1850.0,
            originalPrice = 2400.0,
            stock = 29,
            rating = 4.7,
            reviewCount = 112,
            description = "Hall-sensor LED jump counter rope paired with a 10mm non-slip TPE home workout mat.",
            colors = listOf("Teal / Obsidian"),
            sizes = listOf("183cm Mat + Rope"),
            specs = listOf(
                ProductSpec("Display", "Backlit LCD Jump & Calorie Counter"),
                ProductSpec("Mat", "10mm High-Density Eco TPE")
            ),
            seller = SellerInfo("Kinetix Athletics", 4.8, "Dhaka"),
            freeDelivery = false,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            todaysDeal = true,
            accentColor = Color(0xFF14B8A6),
            secondaryColor = Color(0xFF3B82F6),
            imageViews = listOf("Workout Bundle"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_shoe_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 11. BOOKS & STATIONERY
        Product(
            id = "p_book_1",
            name = "Atomic Habits + Neon Productivity Planner Set",
            nameBn = "অ্যাটমিক হ্যাবিটস ও প্রোডাক্টিভিটি প্ল্যানার সেট",
            brand = "NordicNest",
            category = CategoryId.BOOKS,
            price = 790.0,
            originalPrice = 1050.0,
            stock = 60,
            rating = 4.9,
            reviewCount = 305,
            description = "International bestseller paired with a 120GSM dot-grid undated productivity journal & 2 metallic gel pens.",
            colors = listOf("Cosmic Edition"),
            sizes = listOf("Paperback + A5 Journal"),
            specs = listOf(
                ProductSpec("Paper", "120GSM Bleed-Proof Ivory"),
                ProductSpec("Includes", "Book + A5 Planner + 2 Pens")
            ),
            seller = SellerInfo("PageTurners BD", 4.9, "Dhaka"),
            freeDelivery = false,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            bestSeller = true,
            accentColor = Color(0xFF6366F1),
            secondaryColor = Color(0xFFA855F7),
            imageViews = listOf("Gift Box Set"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_comp_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 12. GROCERY
        Product(
            id = "p_groc_1",
            name = "Sundarbans Raw Wildflower Honey + Roasted Almonds",
            nameBn = "সুন্দরবনের খাঁটি মধু ও রোস্টেড বাদাম কম্বো",
            brand = "NordicNest",
            category = CategoryId.GROCERY,
            price = 1250.0,
            originalPrice = 1500.0,
            stock = 40,
            rating = 4.9,
            reviewCount = 278,
            description = "100% lab-tested raw Sundarbans honey (500g glass jar) bundled with lightly salted California roasted almonds (250g).",
            colors = listOf("Natural Raw"),
            sizes = listOf("500g + 250g Combo"),
            specs = listOf(
                ProductSpec("Purity", "BSTI & Lab Tested 100% Raw"),
                ProductSpec("Packaging", "Vacuum Sealed Food-Grade Glass")
            ),
            seller = SellerInfo("PureHarvest BD", 4.9, "Khulna / Dhaka"),
            freeDelivery = false,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            trending = true,
            accentColor = Color(0xFF22C55E),
            secondaryColor = Color(0xFFF59E0B),
            imageViews = listOf("Honey Jar & Almond Pack"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = emptyList(),
            frequentlyBoughtIds = emptyList()
        ),

        // 13. BABY PRODUCTS
        Product(
            id = "p_baby_1",
            name = "CloudSoft Organic Bamboo Baby Swaddle & Carrier",
            nameBn = "ক্লাউডসফট অর্গানিক বেবি সোয়াডল ও ক্যারিয়ার",
            brand = "Lumina",
            category = CategoryId.BABY,
            price = 2490.0,
            originalPrice = 3100.0,
            stock = 19,
            rating = 4.8,
            reviewCount = 89,
            description = "Hypoallergenic breathable bamboo muslin swaddle blanket + ergonomic hip-seat baby carrier for gentle comfort.",
            colors = listOf("Sky Cloud", "Blush Mint"),
            sizes = listOf("0–24 Months"),
            specs = listOf(
                ProductSpec("Material", "100% Organic Bamboo Cotton"),
                ProductSpec("Safety", "Ergonomic M-Position Hip Support")
            ),
            seller = SellerInfo("LittleJoy Care", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            accentColor = Color(0xFFF472B6),
            secondaryColor = Color(0xFF38BDF8),
            imageViews = listOf("Carrier & Swaddle Set"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = emptyList(),
            frequentlyBoughtIds = emptyList()
        ),

        // 14. ACCESSORIES
        Product(
            id = "p_acc_1",
            name = "NovaWatch Fit AMOLED + MagSafe PowerBank 10K",
            nameBn = "নোভাওয়াচ ফিট AMOLED ও ম্যাগসেফ পাওয়ারব্যাংক",
            brand = "NovaTech",
            category = CategoryId.ACCESSORIES,
            price = 3890.0,
            originalPrice = 5200.0,
            stock = 24,
            rating = 4.8,
            reviewCount = 187,
            description = "1.78\" Always-On AMOLED smartwatch with Bluetooth calling + slim 10,000mAh 20W PD wireless magnetic power bank.",
            colors = listOf("Cosmic Black", "Neon Purple"),
            sizes = listOf("Combo Pack"),
            specs = listOf(
                ProductSpec("Watch", "AMOLED • SpO2 • 10-Day Battery"),
                ProductSpec("PowerBank", "10,000mAh 20W USB-C + 15W Mag")
            ),
            seller = SellerInfo("NovaTech Official BD", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            flashSale = true,
            trending = true,
            accentColor = Color(0xFFEAB308),
            secondaryColor = Color(0xFFA855F7),
            imageViews = listOf("Smartwatch Face", "Magnetic PowerBank"),
            reviews = listOf(ProductReview("r10", "Tariqul Islam", 5, "Great gift combo! Watch screen is butter smooth.", "2 days ago")),
            qaList = emptyList(),
            relatedIds = listOf("p_mob_1", "p_elec_1"),
            frequentlyBoughtIds = listOf("p_mob_1")
        ),
        Product(
            id = "p_acc_2",
            name = "AeroCore 7-in-1 Aluminum USB-C Hub & Sleeve",
            nameBn = "এরোকোর ৭-ইন-১ USB-C হাব ও ল্যাপটপ স্লিভ",
            brand = "AeroCore",
            category = CategoryId.ACCESSORIES,
            price = 2290.0,
            originalPrice = 2990.0,
            stock = 35,
            rating = 4.7,
            reviewCount = 91,
            description = "4K@60Hz HDMI, 100W PD pass-through, SD/TF & 3x USB-A 3.2 hub with water-resistant 14\" neoprene sleeve.",
            colors = listOf("Space Gray"),
            sizes = listOf("14-inch"),
            specs = listOf(
                ProductSpec("Ports", "4K HDMI + 100W PD + 3x USB 3.2 + SD"),
                ProductSpec("Protection", "Shockproof Plush Lining")
            ),
            seller = SellerInfo("AeroCore Flagship", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            accentColor = Color(0xFF00D4FF),
            secondaryColor = Color(0xFF6366F1),
            imageViews = listOf("Aluminum Hub + Sleeve"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_comp_1"),
            frequentlyBoughtIds = emptyList()
        ),

        // 15. GAMING PRODUCTS
        Product(
            id = "p_gam_1",
            name = "VeloGear Phantom 75% Hot-Swap RGB Mechanical Keyboard",
            nameBn = "ভেলোগিয়ার ফ্যান্টম RGB মেকানিক্যাল কিবোর্ড",
            brand = "VeloGear",
            category = CategoryId.GAMING,
            price = 4490.0,
            originalPrice = 5690.0,
            stock = 14,
            rating = 4.9,
            reviewCount = 229,
            description = "Gasket-mounted tri-mode (2.4GHz / Bluetooth / USB-C) mechanical keyboard with pre-lubed linear switches & PBT keycaps.",
            colors = listOf("Cyber Purple", "Stealth Neon"),
            sizes = listOf("Linear Red Switch", "Tactile Brown Switch"),
            specs = listOf(
                ProductSpec("Connectivity", "Tri-Mode 1000Hz Wireless"),
                ProductSpec("Mount", "Gasket Mount + Poron Foam"),
                ProductSpec("Keycaps", "Double-Shot PBT Pudding")
            ),
            seller = SellerInfo("VeloGear Esports", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            flashSale = true,
            featured = true,
            trending = true,
            accentColor = Color(0xFFFF2E93),
            secondaryColor = Color(0xFF00D4FF),
            imageViews = listOf("75% Gasket Deck", "South-Facing RGB"),
            reviews = listOf(ProductReview("r11", "Samiul Bashar", 5, "Creamy thocky sound right out of the box!", "1 day ago")),
            qaList = listOf(ProductQA("q6", "Works with Mac & Windows?", "Yes, physical Mac/Win toggle switch on the back.", "Kazi")),
            relatedIds = listOf("p_gam_2", "p_elec_1", "p_comp_2"),
            frequentlyBoughtIds = listOf("p_gam_2")
        ),
        Product(
            id = "p_gam_2",
            name = "VeloGear Viper 49g Wireless Esports Mouse",
            nameBn = "ভেলোগিয়ার ভাইপার ৪৯ গ্রাম ওয়্যারলেস গেমিং মাউস",
            brand = "VeloGear",
            category = CategoryId.GAMING,
            price = 3190.0,
            originalPrice = 3990.0,
            stock = 22,
            rating = 4.8,
            reviewCount = 143,
            description = "Ultra-light 49g PAW3395 26,000 DPI flagship sensor wireless gaming mouse with optical switches.",
            colors = listOf("Neon White", "Obsidian Black"),
            sizes = listOf("Standard"),
            specs = listOf(
                ProductSpec("Sensor", "PAW3395 • 26,000 DPI"),
                ProductSpec("Weight", "49g Honeycomb-Free Shell")
            ),
            seller = SellerInfo("VeloGear Esports", 4.9, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 2,
            newArrival = true,
            accentColor = Color(0xFF00D4FF),
            secondaryColor = Color(0xFFFF2E93),
            imageViews = listOf("49g Esports Shell"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_gam_1", "p_comp_2"),
            frequentlyBoughtIds = listOf("p_gam_1")
        ),

        // 16. AUTOMOTIVE
        Product(
            id = "p_auto_1",
            name = "DriveGuard Dual-Channel 2K Dash Cam + Tire Inflator",
            nameBn = "ড্রাইভগার্ড ২কে ড্যাশ ক্যাম ও টায়ার ইনফ্লেটর",
            brand = "NovaTech",
            category = CategoryId.AUTOMOTIVE,
            price = 5490.0,
            originalPrice = 6800.0,
            stock = 12,
            rating = 4.7,
            reviewCount = 74,
            description = "Sony Starvis night-vision 2K dash cam with GPS speed overlay plus digital cordless 150 PSI car/bike air compressor.",
            colors = listOf("Matte Titanium"),
            sizes = listOf("DashCam + Inflator Bundle"),
            specs = listOf(
                ProductSpec("Video", "1440p Front + 1080p Rear Night Vision"),
                ProductSpec("Compressor", "150 PSI Auto-Shutoff USB-C")
            ),
            seller = SellerInfo("AutoPulse BD", 4.8, "Dhaka"),
            freeDelivery = true,
            deliveryDaysMin = 1,
            deliveryDaysMax = 3,
            todaysDeal = true,
            accentColor = Color(0xFF64748B),
            secondaryColor = Color(0xFF38BDF8),
            imageViews = listOf("DashCam & Inflator"),
            reviews = emptyList(),
            qaList = emptyList(),
            relatedIds = listOf("p_acc_1"),
            frequentlyBoughtIds = emptyList()
        )
    )

    val popularSearches: List<String> = listOf(
        "Phone under ৳20,000",
        "ANC Headphones",
        "OLED Laptop",
        "Mechanical Keyboard",
        "Running Shoes",
        "Glass Skin Serum",
        "Smartwatch",
        "Free Delivery"
    )

    val funnyCards: List<FunnyCard> = listOf(
        FunnyCard(
            id = "fun_1",
            title = "Wi-Fi Enabled Pet Rock Pro Max",
            joke = "Does absolutely nothing, just like your 47 open browser tabs of things you swore you'd buy next payday.",
            fakeTagPrice = "৳99,999 (Not for real sale!)",
            punchline = "Includes 0% battery anxiety because it's literally a stone.",
            initialLaughs = 428
        ),
        FunnyCard(
            id = "fun_2",
            title = "Anti-Procrastination Alarm Mug",
            joke = "Add to Cart -> Close App -> Reopen 3 mins later to check if shipping magically became free.",
            fakeTagPrice = "৳0 (Mental Tax)",
            punchline = "Spoiler: Spend ৳2,000 or use code FREEDEL and shipping IS free!",
            initialLaughs = 612
        ),
        FunnyCard(
            id = "fun_3",
            title = "Invisible Socks for Invisible Steps",
            joke = "Guaranteed to vanish inside your washing machine on the very first spin cycle.",
            fakeTagPrice = "৳404 Not Found",
            punchline = "Warranty void if your cat claims ownership.",
            initialLaughs = 389
        )
    )

    val quizQuestions: List<QuizQuestion> = listOf(
        QuizQuestion(
            id = "qz_1",
            question = "What minimum order value unlocks automatic Free Express Delivery on MY Shop?",
            options = listOf("৳500", "৳2,000", "৳10,000", "৳50,000"),
            correctIndex = 1,
            explanation = "Orders of ৳2,000+ (or any item marked Free Delivery) ship free!"
        ),
        QuizQuestion(
            id = "qz_2",
            question = "Which MY Shop phone delivers 5G, 120Hz AMOLED, and 67W fast charging under ৳20,000?",
            options = listOf("AeroBook Pro 14", "NovaPulse 5G", "VeloGear Phantom", "ApexTab Ultra"),
            correctIndex = 1,
            explanation = "NovaPulse 5G (8GB/256GB) is ৳18,990 during Flash Sale!"
        ),
        QuizQuestion(
            id = "qz_3",
            question = "How many products can you compare side-by-side in MY Shop?",
            options = listOf("Up to 2", "Up to 4", "Up to 6", "Only 1"),
            correctIndex = 1,
            explanation = "You can compare up to 4 products side-by-side with specs, ratings & prices."
        )
    )

    val dailyChallenges: List<DailyChallenge> = listOf(
        DailyChallenge("ch_explore", "Category Explorer", "Browse 3 different product categories today", 60, 3),
        DailyChallenge("ch_compare", "Smart Comparer", "Add 2 products to your Comparison tray", 80, 2),
        DailyChallenge("ch_ai", "Ask MY AI", "Get a personalized recommendation from MY AI", 75, 1),
        DailyChallenge("ch_cart", "Cart Builder", "Add any item to your shopping cart", 50, 1)
    )

    fun findProduct(id: String): Product? = products.firstOrNull { it.id == id }

    fun catalogSummaryForAi(): String = buildString {
        appendLine("MY SHOP LIVE INVENTORY CATALOG (All prices in BDT ৳):")
        products.forEach { p ->
            appendLine(
                "- ID=${p.id} | Name=${p.name} | Brand=${p.brand} | Category=${p.category.titleEn} | " +
                    "Price=৳${p.price.toInt()} (Orig=৳${p.originalPrice.toInt()}, ${p.discountPercent}% off) | " +
                    "Stock=${p.stock} | Rating=${p.rating} (${p.reviewCount} reviews) | " +
                    "FreeDelivery=${p.freeDelivery} | Delivery=${p.deliveryDaysMin}-${p.deliveryDaysMax} days | " +
                    "Specs=${p.specs.joinToString("; ") { "${it.label}: ${it.value}" }}"
            )
        }
        appendLine("COUPONS: MYSHOP10 (10% off >=৳1000), FLASH200 (৳200 off >=৳2500), FREEDEL (free delivery >=৳500).")
        appendLine("POLICIES: Free delivery on orders >=৳2,000 or FreeDelivery=true items. 7-day easy returns. Sandbox payments: bKash, Nagad, Rocket, Local Card, Cash on Delivery, Visa, Mastercard, PayPal.")
    }
}
