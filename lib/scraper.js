import * as cheerio from 'cheerio';

export async function scrapeWebsite(url) {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
    }

    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

export function extractContent(html) {
  const $ = cheerio.load(html);

  // Remove script and style tags
  $('script, style, noscript, iframe').remove();

  // Extract headline (H1)
  let headline = $('h1').first().text().trim();
  if (!headline) {
    // Fallback: look for title or large text
    headline = $('title').text().trim() || 'No headline found';
  }

  // Extract subheadline (H2 or first significant paragraph)
  let subheadline = $('h2').first().text().trim();
  if (!subheadline) {
    // Look for paragraphs near the top
    const paragraphs = $('p').toArray();
    for (let p of paragraphs) {
      const text = $(p).text().trim();
      if (text.length > 20 && text.length < 300) {
        subheadline = text;
        break;
      }
    }
  }
  if (!subheadline) {
    subheadline = 'No subheadline found';
  }

  // Extract CTAs (buttons and links with button-like classes)
  const ctaElements = [];
  
  // Look for buttons
  $('button, a.btn, a.button, [role="button"], a[class*="cta"], a[class*="CTA"]').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length < 100 && text.length > 2) {
      ctaElements.push(text);
    }
  });

  // If no CTAs found, look for prominent links
  if (ctaElements.length === 0) {
    $('a').each((i, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href');
      // Look for action words
      if (text && href && /^(get|start|try|buy|sign|join|learn|download|subscribe)/i.test(text)) {
        ctaElements.push(text);
      }
    });
  }

  const cta = ctaElements.slice(0, 5); // Top 5 CTAs

  // Extract body copy (hero section - first few paragraphs)
  let bodyCopy = '';
  const paragraphs = $('p').toArray().slice(0, 10);
  for (let p of paragraphs) {
    const text = $(p).text().trim();
    if (text.length > 20) {
      bodyCopy += text + ' ';
      if (bodyCopy.length > 500) break;
    }
  }
  bodyCopy = bodyCopy.trim().substring(0, 800);

  if (!bodyCopy) {
    // Fallback: get any text content
    const allText = $('body').text().trim();
    bodyCopy = allText.substring(0, 800);
  }

  return {
    headline: headline.substring(0, 300),
    subheadline: subheadline.substring(0, 500),
    cta: cta.length > 0 ? cta : ['No CTA found'],
    bodyCopy: bodyCopy || 'No body content found',
  };
}