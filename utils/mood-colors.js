/**
 * Map mood keywords to colors
 */
const moodColorMap = {
    // Energetic/Positive
    energetic: '#FFE066',      // Bright yellow
    energized: '#FFE066',      // Bright yellow (same as energetic)
    excited: '#FFB347',        // Orange
    joyful: '#FFD93D',         // Golden yellow
    confident: '#6BCF7F',      // Green
    playful: '#FF6B9D',        // Pink
    happy: '#FFE66D',          // Light yellow
    celebratory: '#FFA07A',    // Light salmon
    hopeful: '#A8E6CF',        // Mint
    defiant: '#E89C31',        // Bold orange
    bold: '#FF8C42',           // Bright orange
    grounded: '#8B9D83',       // Earthy green
    centered: '#A8C5A5',       // Sage green
    poised: '#9FB8AD',         // Calm teal-green
    euphoric: '#FF85E6',       // Bright magenta-pink
    ecstatic: '#FF7ED4',       // Hot pink
    elated: '#FFADFF',         // Light purple-pink
    charged: '#FFD700',        // Gold
    stimulated: '#FFB700',     // Amber
    elevated: '#FFC8DD',       // Rose pink
    transcendent: '#E0B0FF',   // Mauve
    floating: '#D4A5FF',       // Lavender-purple
    weightless: '#E6E6FA',     // Light lavender
    hyped: '#FFFF33',          // Bright yellow

    // Calm/Peaceful
    calm: '#A8D8EA',           // Soft blue
    peaceful: '#B4E7CE',       // Mint green
    content: '#C7CEEA',        // Lavender
    relaxed: '#B8E0D2',        // Seafoam
    serene: '#B3D9E8',         // Sky blue
    
    // Romantic/Emotional
    romantic: '#FFB6C1',       // Light pink
    passionate: '#FF69B4',     // Hot pink
    loving: '#FFABAB',         // Soft coral
    intimate: '#E8B4B8',       // Dusty rose
    tender: '#FADADD',         // Pale pink
    flirty: '#FFB6D9',
    
    // Melancholic/Sad
    bittersweet: '#DDA0DD',
    melancholic: '#9DB4C0',    // Slate blue
    sad: '#A7BEAE',            // Muted sage
    lonely: '#B8C5D6',         // Cool gray-blue
    nostalgic: '#D4A5A5',      // Dusty mauve
    wistful: '#C4B7CB',        // Soft purple-gray
    
    // Anxious/Tense
    anxious: '#D4A373',        // Tan/brown
    stressed: '#C8A882',       // Beige
    tense: '#BDB5A7',          // Gray-tan
    restless: '#E5C185',       // Warm sand
    worried: '#C9B79C',        // Taupe
    overwhelmed: '#D4C4B0',    // Light tan
    
    // Conflicted/Mixed
    conflicted: '#C2A9A0',     // Warm gray
    confused: '#B8AFA8',       // Neutral gray
    uncertain: '#D1C4B5',      // Light tan
    scattered: '#C9BDB1',      // Taupe-gray
    
    // Angry/Intense
    angry: '#E57373',          // Muted red
    frustrated: '#D98880',     // Dusty red
    intense: '#CD5C5C',        // Indian red
    aggressive: '#C97064',     // Terra cotta
    
    // Vulnerable/Introspective
    vulnerable: '#D7BDE2',     // Soft purple
    introspective: '#B39EB5',  // Muted lavender
    reflective: '#C8B8D0',     // Light purple-gray
    thoughtful: '#A8A4C8',     // Periwinkle
    contemplative: '#B8AED4'   // Lilac
};

/**
 * Get sentiment score from mood word (-1 to +1)
 * Basic: use word characteristics
 */
function getSentimentScore(word) {
    const lowerWord = word.toLowerCase();
    
    // Positive indicators
    const positiveWords = ['happy', 'joy', 'excite', 'love', 'peace', 'calm', 'content', 'confident', 'energet', 'hope', 'play', 'celebrat', 'bold', 'euphoric', 'elat', 'hype', 'pump', 'thrill'];
    const negativeWords = ['sad', 'angry', 'anxious', 'lonely', 'worry', 'tense', 'frustrat', 'depress', 'melanchol', 'bitter', 'stress', 'overwhelm', 'vulnerab', 'despond', 'gloom', 'despair'];
    
    const isPositive = positiveWords.some(p => lowerWord.includes(p));
    const isNegative = negativeWords.some(n => lowerWord.includes(n));
    
    if (isPositive) return 0.7;
    if (isNegative) return -0.7;
    return 0; // neutral
}

/**
 * Generate color procedurally from word + sentiment
 */
function generateColorFromWord(word, sentiment) {
    // Create deterministic hash from word
    const hash = Array.from(word.toLowerCase()).reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0);
    
    // Base hue on sentiment
    let hue, saturation, lightness;
    
    if (sentiment > 0.3) {
        // Positive: warm colors (yellow 40° to pink 340°)
        hue = 40 + (hash % 100);        // Yellow to orange range
        saturation = 75 + (hash % 20);  // High saturation (75-95%)
        lightness = 60 + (hash % 15);   // Bright but vibrant (60-75%)
    } else if (sentiment < -0.3) {
        // Negative: cool colors (blue 200° to purple 280°)
        hue = 200 + (hash % 80);        // Blue to purple range
        saturation = 50 + (hash % 30);  // Boosted saturation (50-80%)
        lightness = 50 + (hash % 15);   // Deeper, richer (50-65%)
    } else {
        // Neutral: any hue, vibrant but varied
        hue = hash % 360;
        saturation = 40 + (hash % 35);  // Boosted saturation (40-75%)
        lightness = 60 + (hash % 15);   // Medium lightness (60-75%)
    }
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get color for a single mood word
 */
function getMoodColor(moodWord) {
    const normalized = moodWord.toLowerCase().trim();
    
    // 1. Try exact match in hardcoded map
    if (moodColorMap[normalized]) {
        return moodColorMap[normalized];
    }
    
    // 2. Check for partial matches (e.g., "energetically" matches "energetic")
    for (const [keyword, color] of Object.entries(moodColorMap)) {
        if (normalized.includes(keyword) || keyword.includes(normalized)) {
            return color;
        }
    }

    // 3. Generate procedurally for unknown words
    const sentiment = getSentimentScore(normalized);
    const generatedColor = generateColorFromWord(normalized, sentiment);

    return generatedColor;
}

/**
 * Convert hex color to rgba with opacity
 */
function hexToRgba(hex, opacity) {
    // Handle HSL colors from procedural generation
    if (hex.startsWith('hsl')) {
        // Convert HSL to RGB first (simple approximation)
        // Return the HSL with alpha
        return hex.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Extract colors from mood summary (3 mood words)
 */
function getMoodColors(moodSummary) {
    const moodWords = moodSummary.toLowerCase().split(',').map(w => w.trim());
    const colors = [];
    
    // Map each mood word to a color using getMoodColor()
    moodWords.forEach(mood => {
        if (mood.length > 0) {
            colors.push(getMoodColor(mood));
        }
    });
    
    // Fill with default if we have less than 3 colors
    while (colors.length < 3) {
        if (colors.length > 0) {
            // Repeat existing colors with slight variation
            colors.push(colors[0]);
        } else {
            // No matches, use neutral
            colors.push('#E8E8E8');
        }
    }
    
    return colors.slice(0, 3); // exactly 3 colors
}

/**
 * Create layered radial gradient CSS for mood aura
 */
function createMoodGradient(moodSummary, opacity = 0.4) {
    const colors = getMoodColors(moodSummary);
    
    // Gradient positions for 3-color aura effect
    const positions = [
        'ellipse at 15% 25%',   // Top-left
        'ellipse at 85% 30%',   // Top-right
        'ellipse at 50% 85%'    // Bottom-center
    ];
    
    // Vary opacity slightly if using repeated colors
    const opacities = colors[0] === colors[1] && colors[1] === colors[2]
        ? [opacity, opacity * 0.75, opacity * 0.85]  // Vary for single color
        : colors[0] === colors[1] || colors[1] === colors[2]
        ? [opacity, opacity * 0.85, opacity]       // Vary for 2 colors
        : [opacity, opacity, opacity];             // Same for 3 colors
    
    // Build gradient layers
    const gradients = colors.map((color, i) => {
        const rgba = hexToRgba(color, opacities[i]);
        return `radial-gradient(${positions[i]}, ${rgba} 0%, transparent 60%)`;
    });
    
    // Combine all gradients with base color
    return gradients.join(', ') + ', #FAFAFA';
}

module.exports = {
    getMoodColors,
    getMoodColor,
    createMoodGradient,
    hexToRgba,
    moodColorMap
};