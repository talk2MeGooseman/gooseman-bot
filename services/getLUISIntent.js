require('dotenv').config();
const axios = require('axios');

const INTENTS = {
  TURN_ON_COLOR: 'Turn.On.Color',
  TURN_ON_BLINK: 'Turn.On.Blink',
}
exports.INTENTS = INTENTS;

const ENTITY_TYPES = {
  LIGHT: 'Light',
  COLOR: 'Color',
  COLOR_HEX: 'Color.Hex',
  BLINK: 'Blink',
};
exports.ENTITY_TYPES = ENTITY_TYPES;

async function getLUISIntent(query) {
  const encodedQuery = encodeURIComponent(query);
  const LUIS_URL = `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${process.env.LUIS_APP_ID}?staging=true&verbose=true&timezoneOffset=-360&subscription-key=${process.env.LUIS_KEY}&q=${encodedQuery}`;
  try {
    const { data } = await axios.get(LUIS_URL);
    if (data.topScoringIntent.intent != 'None' && data.topScoringIntent.score >= .8) {
      const entities = data.entities.map(({ type, entity }) => {
        return {
          type,
          entity
        };
      });

      return {
        query: data.query,
        intent: data.topScoringIntent.intent,
        entities
      };
    }
  }
  catch (error) {
    console.error('Failed to perform LUIS Request');
  }
  return undefined;
}
exports.getLUISIntent = getLUISIntent;
