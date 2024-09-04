import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  // Set the CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allows all origins, or you can specify 'http://localhost:3000'
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');  // Allow specific HTTP methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request (for OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const browser = await puppeteer.launch({ headless: true });
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

  res.status(200).json({
    combinedText,
    averageRating: averageRating.toFixed(2),
  });

  // Example response
  res.status(200).json({
    message: 'CORS is enabled!',
  });
}


// // main.js

// import puppeteer from 'puppeteer';
// import { sendPrompt } from './gpt.js';  // Import sendPrompt function

// (async () => {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   const link = `https://www.yelp.com/biz/burgerfi-brooklyn-2?osq=burger+fi`;

//   let allTextContent = [];
//   let totalRatings = 0;
//   let ratingCount = 0;

//   for (let startNumber = 0; startNumber < 30; startNumber += 10) {
//     console.log(`Scraping page: ${link}?start=${startNumber}&sort_by=date_desc`);

//     // Navigate to the Yelp page
//     await page.goto(`${link}?start=${startNumber}&sort_by=date_desc`, {
//       waitUntil: 'networkidle2',
//     });

//     // Wait for the reviews section to load
//     try {
//       await page.waitForSelector('#reviews', { timeout: 5000 });  // 5-second timeout
//     } catch (error) {
//       console.log("Reviews section not found, breaking the loop.");
//       break;  // Exit the loop if #reviews is not found
//     }


//     const data = await page.evaluate(() => {
//       var myElement = document.getElementById("reviews");

//       var spans = myElement.querySelectorAll('span[lang="en"]');
//       var textContents = Array.from(spans).map(span => span.textContent);

//       var starRatings = myElement.querySelectorAll('[aria-label*="star rating"]');
//       var filteredStarRatings = Array.from(starRatings).filter(element => {
//         return /^(1|2|3|4|5) star rating$/.test(element.getAttribute('aria-label'));
//       });

//       var totalRatings = 0;
//       var ratingCount = filteredStarRatings.length;

//       filteredStarRatings.forEach(element => {
//         var rating = parseInt(element.getAttribute('aria-label').charAt(0), 10);
//         totalRatings += rating;
//       });

//       return {
//         textContent: textContents,
//         totalRatings: totalRatings,
//         ratingCount: ratingCount,
//       };
//     });

//     allTextContent.push(...data.textContent);
//     totalRatings += data.totalRatings;
//     ratingCount += data.ratingCount;
//   }

//   const averageRating = ratingCount > 0 ? (totalRatings / ratingCount) : 0;
//   const combinedText = allTextContent.join('\n');

//   console.log("Final Combined Text Content: ", combinedText);
//   console.log("Final Average Star Rating: ", averageRating.toFixed(2));

//   await browser.close();

//   const prompt = `Summarize and give me 10 highlights:\n\n${combinedText}`;

//   const openaiResponse = await sendPrompt(prompt);
//   console.log("OpenAI Response: ", openaiResponse);
// })();
