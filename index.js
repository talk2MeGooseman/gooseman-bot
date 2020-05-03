require('dotenv').config();
const v3 = require('node-hue-api').v3;
const ComfyJS = require('comfy.js');
const hueApp = require('./services/hueApp');
const chroma = require('chroma-js');
const { askQnAMaker } = require("./services/askQnAMaker");
const { getLUISIntent, INTENTS, ENTITIES } = require("./services/getLUISIntent");

const IGNORED_CHATTERS = ['gooseman_bot', 'streamelements'];

async function changeHueLightsColor(rgbColor) {
  if (rgbColor) {
    const lightState = hueApp.buildStateFor({
      type: 'light',
      desiredEvent: 'color',
      rgbColor,
    });
    const officeGroup = await hueApp.getGroupByName('Office');

    officeGroup.lights.forEach((lightId) => {
      hueApp.setLightState(lightId, lightState);
    });
  }
}

ComfyJS.onChat = async (user, message, flags) => {
  if (IGNORED_CHATTERS.includes(user.toLowerCase())) {
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
    } else if (command === 'luis') {
      if(message.length === 0) {
        ComfyJS.Say('Tell Luis what you would like it to do. Right now Luis can control the color of the lights but more capabilities are to come.');
        return;
      }

      const intent = await getLUISIntent(message)
      console.log(intent)

      if(intent.intent === INTENTS.TURN_ON_COLOR) {
        const isLightAction = intent.entities.find((e) => e.type === ENTITIES.LIGHT)
        // Check if type Light
        if (!isLightAction) return;

        const { entity: entityColor } = intent.entities.find((e) => (e.type === ENTITIES.COLOR || e.type === ENTITIES.COLOR_HEX))

        if(chroma.valid(entityColor)) {
          const rgbColor = chroma(entityColor).rgb();
          await changeHueLightsColor(rgbColor);
        }
      } else if(intent.intent === INTENTS.TURN_ON_BLINK) {
        const lightState = hueApp.buildStateFor({
          desiredEvent: 'blink',
        });

        const officeGroup = await hueApp.getGroupByName('Office');
        hueApp.setGroupLightState(officeGroup.id, lightState);
      }
    } else if (command === 'hue_groups' && flags.broadcaster) {
      await hueApp.getGroups();
    } else if (command === 'color') {
      if(chroma.valid(message)) {
        const rgbColor = chroma(message).rgb();
        await changeHueLightsColor(rgbColor);
      };
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
    console.error('Error happened when running command:',command);
  }
};

ComfyJS.onConnected = () => {
  // ComfyJS.Say("I'm Alive Baby!");
};

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman');

