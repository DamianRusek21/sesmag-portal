const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

router.get('/health', authenticateToken, (req, res) => {
  res.json({
    message: 'AI route is connected',
    provider: 'gemini',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    keyStartsWith: process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.slice(0, 6)
      : null
  });
});

router.post('/improve-bio', authenticateToken, async (req, res) => {
  try {
    const { bio } = req.body;

    if (!bio || !bio.trim()) {
      return res.status(400).json({ error: 'Bio is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in backend environment variables'
      });
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `Rewrite this employee profile bio so it sounds clear, professional, natural, and realistic. ` +
                  `Do not exaggerate experience. Keep it concise.\n\nBio:\n${bio}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'Gemini API request failed'
      });
    }

    const improved = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!improved) {
      return res.status(500).json({ error: 'No Gemini response returned' });
    }

    await logActivity(
      req.user.id,
      'ai_improve_bio',
      `${req.user.full_name} used the Gemini AI bio assistant`
    );

    res.json({ improved });
  } catch (err) {
    console.error('AI route error:', err);
    res.status(500).json({ error: err.message || 'AI failed' });
  }
});

module.exports = router;