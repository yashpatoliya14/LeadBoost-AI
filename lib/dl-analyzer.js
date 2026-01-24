// Dynamic import for optional ML - may not work in serverless environments
let pipeline = null;
let natural = null;
let nlp = null;
let mlAvailable = false;

// Cache models for reuse
let sentimentAnalyzer = null;
let classificationModel = null;

/**
 * Initialize dependencies (lazy loading with fallback)
 */
async function initializeDependencies() {
  if (natural !== null && nlp !== null) return; // Already initialized

  try {
    // These should always work
    const naturalModule = await import('natural');
    const compromiseModule = await import('compromise');
    natural = naturalModule.default || naturalModule;
    nlp = compromiseModule.default || compromiseModule;
  } catch (error) {
    console.warn('NLP libraries not available:', error.message);
  }
}

/**
 * Initialize ML models (lazy loading with graceful fallback)
 */
async function initializeModels() {
  // First ensure basic NLP is available
  await initializeDependencies();

  // Skip if already tried and failed
  if (mlAvailable === false && sentimentAnalyzer === null && pipeline === null) {
    try {
      // Dynamic import to avoid build issues on Vercel
      const transformers = await import('@xenova/transformers');
      pipeline = transformers.pipeline;
      mlAvailable = true;
    } catch (error) {
      console.warn('ML models not available (expected on Vercel):', error.message);
      mlAvailable = false;
      return false;
    }
  }

  if (!mlAvailable || !pipeline) {
    return false;
  }

  try {
    if (!sentimentAnalyzer) {
      console.log('Loading sentiment analysis model...');
      sentimentAnalyzer = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      );
    }

    if (!classificationModel) {
      console.log('Loading text classification model...');
      classificationModel = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased'
      );
    }
    return true;
  } catch (error) {
    console.warn('Failed to load ML models:', error.message);
    mlAvailable = false;
    return false;
  }
}

/**
 * Calculate readability scores using multiple metrics
 */
function calculateReadability(text) {
  if (!text || text.length < 10) return 0;

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  // Flesch Reading Ease Score (0-100, higher is better)
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  // Normalize to 0-10 scale
  return Math.max(0, Math.min(10, fleschScore / 10));
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;

  // Adjust for silent 'e'
  if (word.endsWith('e')) count--;

  return Math.max(1, count);
}

/**
 * Safe tokenization with fallback
 */
function safeTokenize(text) {
  if (!text) return [];
  // Try natural tokenizer if available, otherwise simple split
  if (natural && natural.WordTokenizer) {
    try {
      const tokenizer = new natural.WordTokenizer();
      return tokenizer.tokenize(text.toLowerCase()) || [];
    } catch (e) {
      // Fallback to simple split
    }
  }
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

/**
 * Safe NLP processing with fallback
 */
function safeNlp(text) {
  if (!text) return null;
  if (nlp) {
    try {
      return nlp(text);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Analyze headline effectiveness using linguistic features
 */
function analyzeHeadlineEffectiveness(headline) {
  if (!headline || headline.length < 5) return { score: 0, features: { hasNumber: false, hasActionVerb: false, wordCount: 0, hasQuestion: false, hasEmotionalWords: false, hasNegation: false, optimalLength: false } };

  const doc = safeNlp(headline);
  const tokens = safeTokenize(headline);

  // Feature detection
  const hasNumber = /\d+/.test(headline);
  const hasActionVerb = doc ? doc.verbs().out('array').some(verb =>
    ['get', 'start', 'discover', 'unlock', 'learn', 'create', 'build', 'achieve'].includes(verb.toLowerCase())
  ) : tokens.some(t => ['get', 'start', 'discover', 'unlock', 'learn', 'create', 'build', 'achieve'].includes(t));
  const wordCount = tokens.length;
  const hasQuestion = headline.includes('?');
  const hasEmotionalWords = tokens.some(word =>
    ['amazing', 'incredible', 'powerful', 'essential', 'ultimate', 'revolutionary', 'proven'].includes(word)
  );
  const hasNegation = tokens.some(word => ['no', 'never', 'without', 'stop'].includes(word));

  // Calculate effectiveness score
  let score = 50; // Base score

  // Optimal length: 6-12 words
  if (wordCount >= 6 && wordCount <= 12) score += 15;
  else if (wordCount < 6) score -= 10;
  else if (wordCount > 15) score -= 15;

  // Bonus features
  if (hasNumber) score += 15; // Numbers increase CTR
  if (hasActionVerb) score += 10; // Action-oriented
  if (hasEmotionalWords) score += 10; // Emotional appeal
  if (hasQuestion) score += 5; // Curiosity
  if (hasNegation) score += 8; // Pain point addressing

  // Capitalize first letter bonus
  if (headline[0] === headline[0].toUpperCase()) score += 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    features: {
      hasNumber,
      hasActionVerb,
      wordCount,
      hasQuestion,
      hasEmotionalWords,
      hasNegation,
      optimalLength: wordCount >= 6 && wordCount <= 12
    }
  };
}

/**
 * Analyze CTA effectiveness
 */
function analyzeCtaEffectiveness(ctaText) {
  if (!ctaText || ctaText.length < 2) return { score: 0, features: { startsWithVerb: false, hasUrgency: false, hasFreeOffer: false, isShort: false, wordCount: 0 } };

  const tokens = safeTokenize(ctaText);
  const doc = safeNlp(ctaText);

  // CTA best practices
  const startsWithVerb = (doc ? doc.verbs().out('array').length > 0 : false) &&
    ['get', 'start', 'try', 'join', 'learn', 'download', 'sign', 'buy', 'subscribe']
      .some(v => ctaText.toLowerCase().startsWith(v));

  const hasUrgency = ['now', 'today', 'instantly', 'immediately'].some(word =>
    ctaText.toLowerCase().includes(word)
  );

  const hasFreeOffer = ['free', 'trial', '0', 'no cost'].some(word =>
    ctaText.toLowerCase().includes(word)
  );

  const wordCount = tokens.length;
  const isShort = wordCount >= 1 && wordCount <= 4; // Best CTA length

  let score = 50;

  if (startsWithVerb) score += 20;
  if (hasUrgency) score += 15;
  if (hasFreeOffer) score += 15;
  if (isShort) score += 15;
  else if (wordCount > 6) score -= 15;

  // Generic CTAs score lower
  const genericCtas = ['click here', 'learn more', 'read more', 'submit'];
  if (genericCtas.some(g => ctaText.toLowerCase().includes(g))) {
    score -= 20;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    features: {
      startsWithVerb,
      hasUrgency,
      hasFreeOffer,
      isShort,
      wordCount
    }
  };
}

/**
 * Analyze specificity of text
 */
function analyzeSpecificity(text) {
  if (!text || text.length < 10) return 0;

  const doc = safeNlp(text);

  // Count specific elements
  const numbers = (text.match(/\d+/g) || []).length;
  const percentages = (text.match(/\d+%/g) || []).length;
  const properNouns = doc ? doc.match('#ProperNoun').out('array').length : 0;

  const tokens = safeTokenize(text);
  const totalWords = tokens.length;

  // Vague words reduce specificity
  const vagueWords = ['things', 'stuff', 'very', 'really', 'some', 'many', 'several'];
  const vagueCount = tokens.filter(w => vagueWords.includes(w)).length;

  // Calculate specificity score (0-10)
  let score = 5; // Base score

  score += Math.min(3, numbers * 0.5); // Numbers add specificity
  score += Math.min(2, percentages * 1); // Percentages are very specific
  score += Math.min(2, properNouns * 0.3); // Named entities
  score -= Math.min(3, vagueCount * 0.5); // Vague words reduce score

  return Math.max(0, Math.min(10, score));
}

/**
 * Calculate persuasiveness score
 */
function analyzePersuasiveness(text) {
  if (!text || text.length < 10) return 0;

  const tokens = safeTokenize(text);

  // Persuasive elements
  const benefitWords = ['save', 'gain', 'improve', 'increase', 'boost', 'enhance', 'achieve', 'success'];
  const urgencyWords = ['now', 'today', 'limited', 'exclusive', 'don\'t miss', 'hurry', 'instantly'];
  const socialProofWords = ['trusted', 'proven', 'expert', 'professional', 'leading', 'top-rated'];
  const powerWords = ['guaranteed', 'revolutionary', 'breakthrough', 'transform', 'ultimate'];

  const benefitCount = tokens.filter(w => benefitWords.includes(w)).length;
  const urgencyCount = tokens.filter(w => urgencyWords.includes(w)).length;
  const socialProofCount = tokens.filter(w => socialProofWords.includes(w)).length;
  const powerWordCount = tokens.filter(w => powerWords.includes(w)).length;

  let score = 3; // Base score

  score += Math.min(3, benefitCount * 0.8);
  score += Math.min(2, urgencyCount * 0.7);
  score += Math.min(2, socialProofCount * 0.8);
  score += Math.min(1, powerWordCount * 0.5);

  return Math.max(0, Math.min(10, score));
}

/**
 * Create fallback sentiment result when ML is unavailable
 */
function createFallbackSentiment(text) {
  // Simple rule-based sentiment using positive/negative word lists
  const positiveWords = ['good', 'great', 'best', 'amazing', 'excellent', 'love', 'perfect', 'awesome', 'fantastic', 'wonderful', 'success', 'win', 'free', 'easy', 'fast', 'new', 'save', 'gain'];
  const negativeWords = ['bad', 'worst', 'hate', 'terrible', 'awful', 'fail', 'problem', 'issue', 'difficult', 'hard', 'expensive', 'slow', 'old', 'lose', 'miss'];

  const words = (text || '').toLowerCase().split(/\s+/);
  const positiveCount = words.filter(w => positiveWords.includes(w)).length;
  const negativeCount = words.filter(w => negativeWords.includes(w)).length;

  if (positiveCount > negativeCount) {
    return { label: 'POSITIVE', score: 0.6 + (positiveCount * 0.05) };
  } else if (negativeCount > positiveCount) {
    return { label: 'NEGATIVE', score: 0.6 + (negativeCount * 0.05) };
  }
  return { label: 'NEUTRAL', score: 0.5 };
}

/**
 * Main DL analysis function
 */
export async function analyzeMl(extractedContent) {
  try {
    console.log('Starting analysis...');

    // Initialize models (may fail gracefully on Vercel)
    const modelsAvailable = await initializeModels();

    // Rule-based analysis (always works)
    const headlineEffectiveness = analyzeHeadlineEffectiveness(extractedContent.headline);
    const ctaEffectiveness = analyzeCtaEffectiveness(extractedContent.cta[0] || '');

    // Calculate linguistic metrics
    const headlineReadability = calculateReadability(extractedContent.headline);
    const subheadlineReadability = calculateReadability(extractedContent.subheadline);
    const bodyReadability = calculateReadability(extractedContent.bodyCopy);

    const headlineSpecificity = analyzeSpecificity(extractedContent.headline);
    const subheadlineSpecificity = analyzeSpecificity(extractedContent.subheadline);

    const headlinePersuasiveness = analyzePersuasiveness(extractedContent.headline);
    const ctaPersuasiveness = analyzePersuasiveness(extractedContent.cta.join(' '));
    const bodyPersuasiveness = analyzePersuasiveness(extractedContent.bodyCopy);

    // Get sentiment (from ML if available, otherwise rule-based fallback)
    let headlineSentiment, subheadlineSentiment, bodyCopySentiment;

    if (modelsAvailable && sentimentAnalyzer) {
      console.log('Using ML-based sentiment analysis...');
      [headlineSentiment, subheadlineSentiment, bodyCopySentiment] = await Promise.all([
        sentimentAnalyzer(extractedContent.headline).then(r => r[0]),
        sentimentAnalyzer(extractedContent.subheadline).then(r => r[0]),
        sentimentAnalyzer(extractedContent.bodyCopy).then(r => r[0]),
      ]);
    } else {
      console.log('Using rule-based sentiment analysis (ML not available)...');
      headlineSentiment = createFallbackSentiment(extractedContent.headline);
      subheadlineSentiment = createFallbackSentiment(extractedContent.subheadline);
      bodyCopySentiment = createFallbackSentiment(extractedContent.bodyCopy);
    }

    // Build scores
    const mlScores = {
      headline: {
        mlScore: Math.round(headlineEffectiveness.score),
        sentiment: headlineSentiment,
        readability: Math.round(headlineReadability),
        specificity: Math.round(headlineSpecificity),
        persuasiveness: Math.round(headlinePersuasiveness),
        actionability: headlineEffectiveness.features.hasActionVerb ? 8 : 3,
        features: headlineEffectiveness.features,
        prediction: headlineEffectiveness.score >= 70 ? 'High engagement potential' :
          headlineEffectiveness.score >= 50 ? 'Moderate engagement potential' :
            'Low engagement potential'
      },
      subheadline: {
        mlScore: Math.round((subheadlineReadability + subheadlineSpecificity) * 5),
        sentiment: subheadlineSentiment,
        readability: Math.round(subheadlineReadability),
        specificity: Math.round(subheadlineSpecificity),
        clarity: Math.round(subheadlineReadability),
        prediction: subheadlineReadability >= 7 ? 'Clear and readable' : 'Could be clearer'
      },
      cta: {
        mlScore: Math.round(ctaEffectiveness.score),
        actionability: ctaEffectiveness.features.startsWithVerb ? 9 : 4,
        persuasiveness: Math.round(ctaPersuasiveness),
        urgency: ctaEffectiveness.features.hasUrgency ? 9 : 3,
        features: ctaEffectiveness.features,
        prediction: ctaEffectiveness.score >= 70 ? 'Strong CTA with clear action' :
          ctaEffectiveness.score >= 50 ? 'Decent CTA, could be stronger' :
            'Weak CTA, needs improvement'
      },
      bodyCopy: {
        mlScore: Math.round((bodyReadability + bodyPersuasiveness) * 5),
        sentiment: bodyCopySentiment,
        readability: Math.round(bodyReadability),
        persuasiveness: Math.round(bodyPersuasiveness),
        prediction: bodyReadability >= 7 && bodyPersuasiveness >= 6 ?
          'Engaging and persuasive content' :
          'Content needs optimization'
      },
      overall: {
        mlScore: Math.round(
          (headlineEffectiveness.score * 0.30) +
          ((subheadlineReadability + subheadlineSpecificity) * 5 * 0.25) +
          (ctaEffectiveness.score * 0.25) +
          ((bodyReadability + bodyPersuasiveness) * 5 * 0.20)
        ),
        confidence: modelsAvailable ? 'High' : 'Medium (rule-based)',
        modelVersion: modelsAvailable ? 'DistilBERT + Linguistic Analysis v1.0' : 'Rule-based Analysis v1.0'
      }
    };

    console.log('Analysis completed:', {
      headlineML: mlScores.headline.mlScore,
      ctaML: mlScores.cta.mlScore,
      overallML: mlScores.overall.mlScore,
      mlAvailable: modelsAvailable
    });

    return mlScores;

  } catch (error) {
    console.error('Analysis error:', error);
    // Return basic fallback scores instead of throwing
    console.log('Returning fallback scores due to error...');
    return {
      headline: { mlScore: 50, sentiment: { label: 'NEUTRAL', score: 0.5 }, prediction: 'Analysis unavailable', features: { hasNumber: false, hasActionVerb: false, wordCount: 0, hasQuestion: false, hasEmotionalWords: false, hasNegation: false, optimalLength: false } },
      subheadline: { mlScore: 50, sentiment: { label: 'NEUTRAL', score: 0.5 }, prediction: 'Analysis unavailable' },
      cta: { mlScore: 50, prediction: 'Analysis unavailable', features: { startsWithVerb: false, hasUrgency: false, hasFreeOffer: false, isShort: false, wordCount: 0 } },
      bodyCopy: { mlScore: 50, sentiment: { label: 'NEUTRAL', score: 0.5 }, prediction: 'Analysis unavailable' },
      overall: { mlScore: 50, confidence: 'Low (fallback)', modelVersion: 'Fallback v1.0' }
    };
  }
}

/**
 * Generate ML-based predictions for optimization
 */
export function generateMlPredictions(mlScores) {
  const predictions = {
    headlinePrediction: {
      score: mlScores.headline.mlScore,
      prediction: mlScores.headline.prediction,
      improvements: []
    },
    ctaPrediction: {
      score: mlScores.cta.mlScore,
      prediction: mlScores.cta.prediction,
      improvements: []
    },
    overallConversionProbability: mlScores.overall.mlScore,
    confidence: mlScores.overall.confidence
  };

  // Generate improvement suggestions based on ML analysis
  const headlineFeatures = mlScores.headline?.features || {};
  const ctaFeatures = mlScores.cta?.features || {};

  if (mlScores.headline.mlScore < 70) {
    if (!headlineFeatures.hasNumber) {
      predictions.headlinePrediction.improvements.push('Add specific numbers or metrics');
    }
    if (!headlineFeatures.hasActionVerb) {
      predictions.headlinePrediction.improvements.push('Start with an action verb');
    }
    if (!headlineFeatures.optimalLength) {
      predictions.headlinePrediction.improvements.push('Aim for 6-12 words');
    }
  }

  if (mlScores.cta.mlScore < 70) {
    if (!ctaFeatures.startsWithVerb) {
      predictions.ctaPrediction.improvements.push('Start with action verb (Get, Start, Try)');
    }
    if (!ctaFeatures.hasUrgency) {
      predictions.ctaPrediction.improvements.push('Add urgency (Now, Today, Instantly)');
    }
    if (!ctaFeatures.isShort) {
      predictions.ctaPrediction.improvements.push('Keep it short (1-4 words)');
    }
  }

  return predictions;
}
