require('dotenv').config();
const axios = require('axios');

const TURN_ON = 'Turn.On';
exports.TURN_ON = TURN_ON;

const ENTITIES = {
  LIGHT: 'Light',
  COLOR: 'Color',
  COLOR_HEX: 'Color.Hex',
};
exports.ENTITIES = ENTITIES;

async function getLUISIntent(query) {
  const encodedQuery = encodeURIComponent(query);
  const LUIS_URL = `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${process.env.LUIS_APP_ID}?staging=true&verbose=true&timezoneOffset=-360&subscription-key=${process.env.LUIS_KEY}&q=${encodedQuery}`;
  try {
    const { data } = await axios.get(LUIS_URL);
    if (data.topScoringIntent.intent != 'None' && data.topScoringIntent.score >= .9) {
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
