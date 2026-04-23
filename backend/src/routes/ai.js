const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

router.post('/improve-bio', authenticateToken, async (req, res) => {
  try {
    const { bio } = req.body;

    if (!bio || !bio.trim()) {
      return res.status(400).json({ error: 'Bio is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Rewrite short employee profile bios to sound clear, professional, natural, and realistic. Do not exaggerate experience.'
          },
          {
            role: 'user',
            content: `Rewrite this bio:\n\n${bio}`
          }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return res.status(500).json({
        error: data?.error?.message || 'AI request failed'
      });
    }

    const improved = data?.choices?.[0]?.message?.content?.trim();

    if (!improved) {
      return res.status(500).json({ error: 'No AI response returned' });
    }

    await logActivity(
      req.user.id,
      'ai_improve_bio',
      `${req.user.full_name} used the AI bio assistant`
    );

    res.json({ improved });
  } catch (err) {
    console.error('AI route error:', err);
    res.status(500).json({ error: 'AI failed' });
  }
});

module.exports = router;