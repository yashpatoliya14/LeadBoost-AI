'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  BarChart3, 
  TrendingUp, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw
} from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoadingAnalyses(true);
      const response = await fetch('/api/analyze');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze');
      }

      const data = await response.json();
      
      // Poll for completion
      pollAnalysis(data.analysisId);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollAnalysis = async (analysisId) => {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}`);
        if (!response.ok) throw new Error('Failed to fetch analysis');
        
        const analysis = await response.json();

        if (analysis.status === 'completed' || analysis.status === 'failed') {
          setLoading(false);
          setSelectedAnalysis(analysis);
          fetchAnalyses();
          setUrl('');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError('Analysis timed out. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    poll();
  };

  const viewAnalysis = async (analysisId) => {
    try {
      const response = await fetch(`/api/analyses/${analysisId}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');
      const analysis = await response.json();
      setSelectedAnalysis(analysis);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAnalysis = async (analysisId) => {
    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete analysis');
      fetchAnalyses();
      if (selectedAnalysis?._id === analysisId) {
        setSelectedAnalysis(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ConversionAI
                </h1>
                <p className="text-sm text-muted-foreground">AI-Powered Content Optimizer</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyses}
              disabled={loadingAnalyses}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingAnalyses ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Analysis Input */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Analyze Website
                </CardTitle>
                <CardDescription>
                  Enter a website URL to analyze its conversion potential
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !url}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze Content
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Analysis List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Analyses
                </CardTitle>
                <CardDescription>
                  {analyses.length} analysis{analyses.length !== 1 ? 'es' : ''} completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingAnalyses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : analyses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No analyses yet. Start by analyzing a website!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {analyses.map((analysis) => (
                      <div
                        key={analysis._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          selectedAnalysis?._id === analysis._id
                            ? 'bg-primary/5 border-primary'
                            : 'bg-background hover:bg-accent'
                        }`}
                        onClick={() => viewAnalysis(analysis._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {new URL(analysis.url).hostname}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(analysis.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {analysis.status === 'completed' && (
                              <Badge className={getScoreBgColor(analysis.scores?.overall)}>
                                {analysis.scores?.overall}
                              </Badge>
                            )}
                            {analysis.status === 'analyzing' && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {analysis.status === 'failed' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnalysis(analysis._id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Analysis */}
          <div className="lg:col-span-2">
            {!selectedAnalysis ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <TrendingUp className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Analysis Selected</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Analyze a website or select a previous analysis to view detailed conversion optimization insights
                  </p>
                </CardContent>
              </Card>
            ) : selectedAnalysis.status === 'failed' ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <XCircle className="h-12 w-12 text-red-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analysis Failed</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {selectedAnalysis.error || 'An error occurred during analysis'}
                  </p>
                </CardContent>
              </Card>
            ) : selectedAnalysis.status === 'analyzing' ? (
              <Card className="shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analyzing Content...</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Our AI is analyzing the content and generating optimization suggestions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Website Info */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Analysis Complete
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <a
                            href={selectedAnalysis.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            {selectedAnalysis.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(selectedAnalysis.scores.overall)}`}>
                          {selectedAnalysis.scores.overall}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Overall Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription className="text-sm">
                        {selectedAnalysis.explanations.overall}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Detailed Scores */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Conversion Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Headline */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Headline</span>
                        <span className={`font-bold ${getScoreColor(selectedAnalysis.scores.headline.score)}`}>
                          {selectedAnalysis.scores.headline.score}/100
                        </span>
                      </div>
                      <Progress value={selectedAnalysis.scores.headline.score} className="mb-2" />
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">Clarity: {selectedAnalysis.scores.headline.clarity}/10</Badge>
                        <Badge variant="outline">Specificity: {selectedAnalysis.scores.headline.specificity}/10</Badge>
                        <Badge variant="outline">Actionability: {selectedAnalysis.scores.headline.actionability}/10</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedAnalysis.explanations.headline}</p>
                    </div>

                    <Separator />

                    {/* Subheadline */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Subheadline</span>
                        <span className={`font-bold ${getScoreColor(selectedAnalysis.scores.subheadline.score)}`}>
                          {selectedAnalysis.scores.subheadline.score}/100
                        </span>
                      </div>
                      <Progress value={selectedAnalysis.scores.subheadline.score} className="mb-2" />
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">Clarity: {selectedAnalysis.scores.subheadline.clarity}/10</Badge>
                        <Badge variant="outline">Specificity: {selectedAnalysis.scores.subheadline.specificity}/10</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedAnalysis.explanations.subheadline}</p>
                    </div>

                    <Separator />

                    {/* CTA */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Call-to-Action</span>
                        <span className={`font-bold ${getScoreColor(selectedAnalysis.scores.cta.score)}`}>
                          {selectedAnalysis.scores.cta.score}/100
                        </span>
                      </div>
                      <Progress value={selectedAnalysis.scores.cta.score} className="mb-2" />
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">Actionability: {selectedAnalysis.scores.cta.actionability}/10</Badge>
                        <Badge variant="outline">Persuasiveness: {selectedAnalysis.scores.cta.persuasiveness}/10</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedAnalysis.explanations.cta}</p>
                    </div>

                    <Separator />

                    {/* Body Copy */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Body Copy</span>
                        <span className={`font-bold ${getScoreColor(selectedAnalysis.scores.bodyCopy.score)}`}>
                          {selectedAnalysis.scores.bodyCopy.score}/100
                        </span>
                      </div>
                      <Progress value={selectedAnalysis.scores.bodyCopy.score} className="mb-2" />
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">Readability: {selectedAnalysis.scores.bodyCopy.readability}/10</Badge>
                        <Badge variant="outline">Persuasiveness: {selectedAnalysis.scores.bodyCopy.persuasiveness}/10</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedAnalysis.explanations.bodyCopy}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Content & Rewrites */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Content Analysis & Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="headline" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="headline">Headline</TabsTrigger>
                        <TabsTrigger value="subheadline">Subheadline</TabsTrigger>
                        <TabsTrigger value="cta">CTA</TabsTrigger>
                        <TabsTrigger value="body">Body</TabsTrigger>
                      </TabsList>

                      <TabsContent value="headline" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Original:</h4>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{selectedAnalysis.extractedContent.headline}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">AI Suggestions:</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.rewrites.headline.map((rewrite, idx) => (
                              <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <p className="text-sm flex-1">{rewrite}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2"
                                    onClick={() => copyToClipboard(rewrite)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="subheadline" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Original:</h4>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{selectedAnalysis.extractedContent.subheadline}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">AI Suggestions:</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.rewrites.subheadline.map((rewrite, idx) => (
                              <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <p className="text-sm flex-1">{rewrite}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2"
                                    onClick={() => copyToClipboard(rewrite)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="cta" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Original:</h4>
                          <div className="p-3 bg-muted rounded-lg space-y-1">
                            {selectedAnalysis.extractedContent.cta.map((cta, idx) => (
                              <p key={idx} className="text-sm">{cta}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">AI Suggestions:</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.rewrites.cta.map((rewrite, idx) => (
                              <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <p className="text-sm flex-1">{rewrite}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2"
                                    onClick={() => copyToClipboard(rewrite)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="body" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Original:</h4>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{selectedAnalysis.extractedContent.bodyCopy}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">AI Suggestions:</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.rewrites.bodyCopy.map((rewrite, idx) => (
                              <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <p className="text-sm flex-1">{rewrite}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-2"
                                    onClick={() => copyToClipboard(rewrite)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}