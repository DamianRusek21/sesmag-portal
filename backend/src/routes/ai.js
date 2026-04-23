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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'You rewrite profile bios to sound clear, professional, and natural. Keep them concise and realistic. Do not exaggerate.'
          },
          {
            role: 'user',
            content: `Rewrite this profile bio so it sounds more professional but still natural:\n\n${bio}`
          }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({ error: 'AI request failed' });
    }

    const improved = data.choices?.[0]?.message?.content?.trim();

    await logActivity(
      req.user.id,
      'ai_improve_bio',
      `${req.user.full_name} used the AI bio improvement feature`
    );

    res.json({ improved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI failed' });
  }
});

module.exports = router;