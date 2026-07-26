/* STREAMING_CHUNK:Writing Node.js Gemini Vision API proxy handler... */const https = require('https');module.exports = async (req, res) => {// Enable CORSres.setHeader('Access-Control-Allow-Credentials', true);res.setHeader('Access-Control-Allow-Origin', '*');res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');res.setHeader('Access-Control-Allow-Headers','X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
}

if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY process environment variable is not set.' });
}

try {
    const { image } = req.body;
    if (!image) {
        return res.status(400).json({ error: 'Image data URL is required.' });
    }

    // Clean Base64 String
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Prompt definition according to specification
    const systemPrompt = `당신은 학교 급식을 분석하는 전문 영양사입니다.
이미지를 분석하여 아래 JSON 형식으로만 응답하세요.{"foods":[{"name":"","calories":""}],"totalCalories":"","carbohydrate":"","protein":"","fat":"","healthScore":"","comment":""}조건음식명은 한국어칼로리는 예상치학생이 이해하기 쉬운 설명건강 점수는 100점 기준comment는 영양사가 학생에게 설명하듯 작성JSON 외의 문장은 출력하지 않는다.`;  const payload = JSON.stringify({
      contents: [
          {
              parts: [
                  { text: systemPrompt },
                  {
                      inline_data: {
                          mime_type: "image/jpeg",
                          data: base64Data
                      }
                  }
              ]
          }
      ],
      generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
      }
  });

  // Gemini REST API Endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const responseData = await new Promise((resolve, reject) => {
      const parsedUrl = new URL(apiUrl);
      const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
          }
      };

      const apiReq = https.request(options, (apiRes) => {
          let body = '';
          apiRes.on('data', (chunk) => body += chunk);
          apiRes.on('end', () => {
              if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                  resolve(JSON.parse(body));
              } else {
                  reject(new Error(`Gemini API Error Status ${apiRes.statusCode}: ${body}`));
              }
          });
      });

      apiReq.on('error', (e) => reject(e));
      apiReq.write(payload);
      apiReq.end();
  });

  // Extract JSON response string from Gemini structure
  const rawText = responseData.candidates[0].content.parts[0].text;
  const parsedResult = JSON.parse(rawText);

  return res.status(200).json(parsedResult);
} catch (err) {console.error("Vercel Serverless Function Error:", err);return res.status(500).json({ error: 'Failed to analyze meal image.', details: err.message });}};