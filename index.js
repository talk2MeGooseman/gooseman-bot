require('dotenv').config();
const restify = require('restify');
const v3 = require('node-hue-api').v3;
const ComfyJS = require('comfy.js');
const hueApp = require('./services/hueApp');
const chroma = require('chroma-js');
const R = require('ramda');
const { askQnAMaker } = require("./services/askQnAMaker");
const { getLUISIntent, INTENTS, ENTITY_TYPES } = require("./services/getLUISIntent");
const { queryCurrentWeather, getWeatherEmoji } = require('./services/openWeatherAPI');

const IGNORED_CHATTERS = ['gooseman_bot', 'streamelements'];

const isColorOnIntent = R.propEq('intent', INTENTS.TURN_ON_COLOR);
const isBlinkIntent = R.propEq('intent', INTENTS.TURN_ON_BLINK);
const isTemperatureIntent = R.propEq('intent', INTENTS.TEMP);

const hasEntityTypeColorName = R.propEq('type', ENTITY_TYPES.COLOR);
const hasEntityTypeColorHex = R.propEq('type', ENTITY_TYPES.COLOR_HEX);
const hasEntityTypeLocation = R.propEq('type', ENTITY_TYPES.LOCATION);
const hasEntityTypeCelsius = R.propEq('type', ENTITY_TYPES.CELSIUS);

const findColorEntity = (ent) => (R.find(hasEntityTypeColorHex, ent) || R.find(hasEntityTypeColorName, ent));

const findLocationEntity = R.find(hasEntityTypeLocation);
const findCelsiusEntity = R.find(hasEntityTypeCelsius);

const isIgnoredChatter = R.pipe(R.toLower, user => R.includes(user, IGNORED_CHATTERS));

const pipeWhileNotEmpty = R.pipeWith((f, res) => R.isEmpty(res) ? res : f(res));

const changeLightColorPipe = R.pipe((message) => {
  return chroma(message).rgb()
}, changeHueLightsColor);

const changeLightToColorMaybe = R.when(chroma.valid, changeLightColorPipe);

async function loopChangeOfficeLightState(lightState) {
  const officeGroup = await hueApp.getGroupByName('Office');
  officeGroup.lights.forEach((lightId) => {
    hueApp.setLightState(lightId, lightState);
  });
}

async function changeHueLightsColor(rgbColor) {
  if (rgbColor) {
    const lightState = hueApp.buildStateFor({
      type: 'light',
      desiredEvent: 'color',
      rgbColor,
    });

    loopChangeOfficeLightState(lightState);
  }
}

ComfyJS.onChat = async (user, message, flags) => {
  if (isIgnoredChatter(user)) return;

  const sayQnaMakerResponse = pipeWhileNotEmpty([
    askQnAMaker,
    R.andThen(R.replace('{user}', `${user}`)),
  ]);

  const onChatMessagePipe = pipeWhileNotEmpty([
    R.cond([
      [R.equals('Kappa'), R.always('KappaPride')],
      [R.T, sayQnaMakerResponse],
    ]),
    (x) => Promise.resolve(x),
    R.andThen(ComfyJS.Say),
  ]);

  onChatMessagePipe(message)
};

ComfyJS.onCommand = async (user, command, message, flags, extra) => {
  if (isIgnoredChatter(user)) return;

  try {
    if (R.equals(command, 'commands')) {
      ComfyJS.Say('Additional commands: !luis, !alert, !controls');
    } else if (R.equals(command, 'hue_connect') && flags.broadcaster) {
      await hueApp.discoverAndCreateUser();
    } else if (R.equals(command, 'hue_groups') && flags.broadcaster) {
      hueApp.getGroups();
    } else if (R.equals(command, 'luis')) {
      if(R.isEmpty(message)) {
        ComfyJS.Say('Tell Luis what you would like it to do. You can control my lights or check the weather in a city.');
        return;
      }

      const intent = await getLUISIntent(message)
      console.log(intent)

      if(isColorOnIntent(intent)) {
        const { entity: entityColor } = findColorEntity(intent.entities);
        changeLightToColorMaybe(entityColor);
      } else if(isBlinkIntent(intent)) {
        const lightState = hueApp.buildStateFor({
          desiredEvent: 'blink',
        });

        const officeGroup = await hueApp.getGroupByName('Office');
        hueApp.setGroupLightState(officeGroup.id, lightState);
      } else if(isTemperatureIntent(intent)) {
        const { entity: location } = findLocationEntity(intent.entities);
        const celsiusRequested = !!findCelsiusEntity(intent.entities);

        await getWeather(location, celsiusRequested);
      }
    } else if (R.equals(command, 'alert')) {
      const lightState = hueApp.buildStateFor({
        type: 'light',
        desiredEvent: command,
      });

      loopChangeOfficeLightState(lightState);
    }
  } catch (error) {
    console.error('Error happened when running command:', command, error);
  }
};

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman');

async function getWeather(location, isCelsius = false) {
  try {
    const {
      weather,
      main: { temp, feels_like }, } = await queryCurrentWeather(location, isCelsius);
    const { description, id } = weather[0];

    const unit = isCelsius ? 'C' : 'F';

    ComfyJS.Say(
      `It is ${temp}${unit} and ${description} ${getWeatherEmoji(id)} but feels like ${feels_like}${unit}`
    );
  } catch (error) {
    ComfyJS.Say(`Sorry I dont know what the weather is like in ${location}`);
  }

}

function respond(req, res, next) {
  res.send('Honk')
  return next();
}

var server = restify.createServer();
server.get('/', respond);

const port = process.env.PORT || 8080;

server.listen(port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
