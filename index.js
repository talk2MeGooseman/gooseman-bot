require('dotenv').config();
const v3 = require('node-hue-api').v3;
const ComfyJS = require('comfy.js');
const restify = require('restify');
const server = restify.createServer();
const hueApp = require('./hueApp');
const colorToHex = require('colornames');
const theColorAPI = require('./services/theColorAPI');
const { askQnAMaker } = require("./services/askQnAMaker");

function convertToHexCode(message) {
  let result = message;

  const hexCode = colorToHex(message);
  if (hexCode) {
    result = hexCode.replace('#', '');
  }

  return result ;
}

function respond(req, res, next) {
  res.send('I am Alive!!!');
  next();
}

server.get('/', respond);

server.listen(8080, async function() {
  console.log('%s listening at %s', server.name, server.url);
});

ComfyJS.onChat = async (user, message, flags) => {
  if (
    user.toLowerCase() === 'gooseman_bot' ||
    user.toLowerCase() === 'streamelements'
  ) {
    return;
  }

  switch (message) {
    case 'Kappa':
      ComfyJS.Say('KappaPride');
      break;

    default:
      const answer = await askQnAMaker(message);
      if (answer.length > 0) {
        const formattedAnswer = answer.replace('{user}', `${user}`);
        ComfyJS.Say(formattedAnswer);
      }
      break;
  }
};

ComfyJS.onCommand = async (user, command, message, flags, extra) => {
  try {
    if (command === 'hue_connect' && flags.broadcaster) {
      await hueApp.discoverAndCreateUser();
    } else if (command === 'hue_groups' && flags.broadcaster) {
      await hueApp.getGroups();
    } else if (command === 'color') {
      let requestedColor = convertToHexCode(message);
      const hsl = await theColorAPI.fetchColor(requestedColor);

      if (hsl) {
        const lightState = hueApp.buildStateFor({
          type: 'light',
          desiredEvent: command,
          hslColor: hsl,
        });

        const officeGroup = await hueApp.getGroupByName('Office');
        officeGroup.lights.forEach(lightId => {
          hueApp.setLightState(lightId, lightState);
        });
      }
    } else if (command === 'alert') {
      const lightState = hueApp.buildStateFor({
        type: 'light',
        desiredEvent: command,
      });

      const officeGroup = await hueApp.getGroupByName('Office');
      officeGroup.lights.forEach(lightId => {
        hueApp.setLightState(lightId, lightState);
      });
    } else {
      const lightState = hueApp.buildStateFor({ desiredEvent: command });
      if (lightState) {
        const officeGroup = await hueApp.getGroupByName('Office');
        hueApp.setGroupLightState(officeGroup.id, lightState);
      }
    }
  } catch (error) {
    console.error('Error happened when running a command:', error);
  }
};

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman');

ComfyJS.onConnected = () => {
  // ComfyJS.Say("I'm Alive Baby!");
};

