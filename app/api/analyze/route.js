export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCollection } from '@/lib/db';
import { scrapeWebsite, extractContent } from '@/lib/scraper';
import { analyzeContent } from '@/lib/ai-analyzer';
import { analyzeMl, generateMlPredictions } from '@/lib/dl-analyzer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create initial analysis record
    const analysisId = uuidv4();
    const collection = await getCollection('analyses');

    const initialAnalysis = {
      _id: analysisId,
      url,
      status: 'analyzing',
      createdAt: new Date(),
      extractedContent: null,
      scores: null,
      explanations: null,
      rewrites: null,
      error: null,
      completedAt: null,
    };

    await collection.insertOne(initialAnalysis);

    // Start analysis process (async)
    processAnalysis(analysisId, url).catch(console.error);

    return NextResponse.json(
      {
        analysisId,
        status: 'analyzing',
        message: 'Analysis started. Check status endpoint for progress.',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Analysis creation error:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis', details: error.message },
      { status: 500 }
    );
  }
}

async function processAnalysis(analysisId, url) {
  const collection = await getCollection('analyses');

  try {
    // Step 1: Scrape website
    console.log(`[${analysisId}] Scraping ${url}...`);
    const html = await scrapeWebsite(url);

    // Step 2: Extract content
    console.log(`[${analysisId}] Extracting content...`);
    const extractedContent = extractContent(html);

    // Update with extracted content
    await collection.updateOne(
      { _id: analysisId },
      { $set: { extractedContent } }
    );

    // Step 3: Parallel ML and AI Analysis
    console.log(`[${analysisId}] Running ML models and AI analysis in parallel...`);
    const [mlScores, aiAnalysis] = await Promise.all([
      analyzeMl(extractedContent),
      analyzeContent(extractedContent)
    ]);

    // Generate ML predictions
    const mlPredictions = generateMlPredictions(mlScores);

    // Step 4: Update with complete analysis
    await collection.updateOne(
      { _id: analysisId },
      {
        $set: {
          status: 'completed',
          scores: aiAnalysis.scores,
          explanations: aiAnalysis.explanations,
          rewrites: aiAnalysis.rewrites,
          mlScores: mlScores,
          mlPredictions: mlPredictions,
          completedAt: new Date(),
        },
      }
    );

    console.log(`[${analysisId}] Analysis completed successfully`);
    console.log(`[${analysisId}] ML Score: ${mlScores.overall.mlScore}, AI Score: ${aiAnalysis.scores.overall}`);
  } catch (error) {
    console.error(`[${analysisId}] Analysis failed:`, error);

    await collection.updateOne(
      { _id: analysisId },
      {
        $set: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const collection = await getCollection('analyses');

    const analyses = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments({});

    return NextResponse.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch analyses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analyses', details: error.message },
      { status: 500 }
    );
  }
}