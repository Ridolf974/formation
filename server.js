require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/generate-description', async (req, res) => {
  const { nom, dates, lieu, apiKey } = req.body;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(401).json({ error: 'Clé API Anthropic manquante.' });
  }

  if (!nom) {
    return res.status(400).json({ error: 'Le nom de la formation est requis.' });
  }

  const anthropic = new Anthropic({ apiKey: key });

  const prompt = `Tu es un expert en formation professionnelle. Rédige une description courte et professionnelle (2-3 phrases maximum) pour une formation intitulée "${nom}".${dates ? ` Elle se déroule le ${dates}.` : ''}${lieu ? ` Lieu : ${lieu}.` : ''}

La description doit :
- Expliquer brièvement les objectifs et le contenu de la formation
- Être rédigée dans un style professionnel et engageant
- Être en français
- Ne pas dépasser 3 phrases

Réponds uniquement avec la description, sans guillemets ni préambule.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const description = message.content[0].text.trim();
    res.json({ description });
  } catch (error) {
    console.error('Erreur API Anthropic:', error.message);
    if (error.status === 401) {
      return res.status(401).json({ error: 'Clé API invalide.' });
    }
    res.status(500).json({
      error: 'Erreur lors de la génération.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
