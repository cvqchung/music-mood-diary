const { getMoodColor, createMoodGradient } = require('../utils/mood-colors');

console.log('\n=== Testing Mood Colors ===\n');

// Test problematic moods
console.log('chemically-charged:', getMoodColor('chemically-charged'));
console.log('euphoric:', getMoodColor('euphoric'));
console.log('transcendent:', getMoodColor('transcendent'));
console.log('hyped:', getMoodColor('hyped'));
console.log('flirty:', getMoodColor('flirty'));

console.log('\n=== Testing Gradients ===\n');

console.log('Gradient 1:', createMoodGradient('hyped, transcendent, grounded'));
console.log('Gradient 2:', createMoodGradient('confident, energetic, bittersweet'));
console.log('Gradient 3:', createMoodGradient('chemically-charged, euphoric, grounded'));

console.log('\n=== Testing Unknown Words ===\n');

console.log('Unknown positive:', getMoodColor('ecstatic'));
console.log('Unknown negative:', getMoodColor('despondent'));
console.log('Unknown neutral:', getMoodColor('ambiguous'));