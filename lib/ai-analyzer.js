import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeContent(extractedContent) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a conversion rate optimization expert analyzing website content.

Analyze the following website content and provide a detailed conversion optimization report.

**CONTENT TO ANALYZE:**

Headline: "${extractedContent.headline}"
Subheadline: "${extractedContent.subheadline}"
CTA(s): ${JSON.stringify(extractedContent.cta)}
Body Copy: "${extractedContent.bodyCopy}"

**YOUR TASK:**

Provide a JSON response with the following structure (respond ONLY with valid JSON, no markdown):

{
  "scores": {
    "overall": <number 0-100>,
    "headline": {
      "score": <number 0-100>,
      "clarity": <number 0-10>,
      "specificity": <number 0-10>,
      "actionability": <number 0-10>
    },
    "subheadline": {
      "score": <number 0-100>,
      "clarity": <number 0-10>,
      "specificity": <number 0-10>
    },
    "cta": {
      "score": <number 0-100>,
      "actionability": <number 0-10>,
      "persuasiveness": <number 0-10>
    },
    "bodyCopy": {
      "score": <number 0-100>,
      "readability": <number 0-10>,
      "persuasiveness": <number 0-10>
    }
  },
  "explanations": {
    "overall": "<2-3 sentence explanation of overall conversion effectiveness>",
    "headline": "<explain why this score, what makes it strong/weak for conversions>",
    "subheadline": "<explain clarity and value proposition issues/strengths>",
    "cta": "<explain CTA effectiveness and what could improve it>",
    "bodyCopy": "<explain readability and persuasion elements>"
  },
  "rewrites": {
    "headline": ["<improved version 1>", "<improved version 2>", "<improved version 3>"],
    "subheadline": ["<improved version 1>", "<improved version 2>"],
    "cta": ["<improved version 1>", "<improved version 2>", "<improved version 3>"],
    "bodyCopy": ["<improved version 1 (first paragraph)>", "<improved version 2>"]
  }
}

**SCORING CRITERIA:**
- Clarity: Is the message immediately understandable? No jargon?
- Specificity: Does it use concrete details, numbers, or specific benefits?
- Actionability: Does it drive a clear next step?
- Readability: Simple language? Short sentences?
- Persuasiveness: Does it address pain points, benefits, or use social proof?

**REWRITE GUIDELINES:**
- Focus on benefits, not features
- Use action verbs
- Include numbers when possible
- Address user pain points
- Create urgency or curiosity
- Keep it concise

Respond with ONLY the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up the response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(cleanedText);

    // Validate the structure
    if (!analysis.scores || !analysis.explanations || !analysis.rewrites) {
      throw new Error('Invalid analysis structure returned from AI');
    }

    return analysis;
  } catch (error) {
    console.error('AI Analysis error:', error);
    throw new Error(`Failed to analyze content: ${error.message}`);
  }
}