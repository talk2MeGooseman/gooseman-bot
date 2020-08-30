require('dotenv').config();
const axios = require('axios');
const R = require('ramda');
var debug = require('debug')('app-LUIS');

const INTENTS = {
  TURN_ON_COLOR: 'Turn.On.Color',
  TURN_ON_BLINK: 'Turn.On.Blink',
  TEMP: 'Weather.GetTemperature',
};
exports.INTENTS = INTENTS;

const ENTITY_TYPES = {
  LIGHT: 'Light',
  COLOR: 'Color',
  COLOR_HEX: 'Color.Hex',
  BLINK: 'Blink',
  LOCATION: 'Location',
  CELSIUS: 'Celsius',
};
exports.ENTITY_TYPES = ENTITY_TYPES;

const performLuisQuery = R.pipe(
  encodeURIComponent,
  (encodedQuery) =>
    `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${process.env.LUIS_APP_ID}?staging=true&verbose=true&timezoneOffset=-360&subscription-key=${process.env.LUIS_KEY}&q=${encodedQuery}`,
  axios.get,
  R.otherwise(R.always(undefined)),
  R.andThen(R.prop('data'))
);

const parseLuisResponse = (data) =>
  R.pipe(
    R.prop('entities'),
    R.map(({ type, entity }) => {
      return {
        type,
        entity,
      };
    }),
    R.curry((data, entities) => ({
      query: data.query,
      intent: data.topScoringIntent.intent,
      entities,
    }))(data)
  )(data);

async function getLUISIntent(query) {
  try {
    const data = await performLuisQuery(query);

    if (
      data.topScoringIntent.intent != 'None' &&
      data.topScoringIntent.score >= 0.8
    ) {
      return parseLuisResponse(data);
    }
  } catch (error) {
    debug('Failed to perform LUIS Request:', error.message);
  }
  return undefined;
}

exports.getLUISIntent = getLUISIntent;
