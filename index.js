import ComfyJS from 'comfy.js'
import * as dotenv from 'dotenv'
import { onChat, onCommand } from './libs/ramda-helpers/comfy.js'
import { startServer } from './server.js'
import { App } from './services/hue-app.js'
dotenv.config()

let hueApp = new App()

ComfyJS.onChat = async (user, message, _flags, _self, extra) => {
  onChat({ user, message, extra })
}

ComfyJS.onCommand = async (user, command, message, _flags, _extra) => {
  onCommand({ user, command, message, hueApp })
}

ComfyJS.Init('Gooseman_Bot', process.env.OAUTH, 'talk2megooseman')
startServer()
