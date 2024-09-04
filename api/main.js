import chromium from 'chrome-aws-lambda';
import { sendPrompt } from './gpt.js';  // Import the GPT function

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins or specify your frontend URL (e.g., 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    res.status(200).end();  // Respond to OPTIONS request with 200 OK
    return;
  }

  let browser;
  try {
    // Launch Chromium using chrome-aws-lambda
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const link = `https://www.yelp.com/biz/prince-tea-house-brooklyn-3`;

    let allTextContent = [];
    let totalRatings = 0;
    let ratingCount = 0;

    for (let startNumber = 0; startNumber < 30; startNumber += 10) {
      await page.goto(`${link}?start=${startNumber}&sort_by=date_desc`, {
        waitUntil: 'networkidle2',
      });

      try {
        await page.waitForSelector('#reviews', { timeout: 5000 });
      } catch (error) {
        break;
      }

      const data = await page.evaluate(() => {
        var myElement = document.getElementById("reviews");

        var spans = myElement.querySelectorAll('span[lang="en"]');
        var textContents = Array.from(spans).map(span => span.textContent);

        var starRatings = myElement.querySelectorAll('[aria-label*="star rating"]');
        var filteredStarRatings = Array.from(starRatings).filter(element => {
          return /^(1|2|3|4|5) star rating$/.test(element.getAttribute('aria-label'));
        });

        var totalRatings = 0;
        var ratingCount = filteredStarRatings.length;

        filteredStarRatings.forEach(element => {
          var rating = parseInt(element.getAttribute('aria-label').charAt(0), 10);
          totalRatings += rating;
        });

        return {
          textContent: textContents,
          totalRatings: totalRatings,
          ratingCount: ratingCount,
        };
      });

      allTextContent.push(...data.textContent);
      totalRatings += data.totalRatings;
      ratingCount += data.ratingCount;
    }

    const averageRating = ratingCount > 0 ? (totalRatings / ratingCount) : 0;
    const combinedText = allTextContent.join('\n');

    await browser.close();

    // Use GPT to summarize the data
    const prompt = `Summarize and give me 10 highlights:\n\n${combinedText}`;
    const openaiResponse = await sendPrompt(prompt);  // Call GPT from gpt.js
    console.log("OpenAI Response: ", openaiResponse);

    res.status(200).json({
      combinedText,
      averageRating: averageRating.toFixed(2),
      gptSummary: openaiResponse,
    });
  } catch (error) {
    console.error('Error launching Puppeteer', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to launch Puppeteer' });
  }
}
