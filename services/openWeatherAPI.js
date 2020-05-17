require('dotenv').config();
const axios = require('axios');

const openWeatherAxios = axios.create({
  baseURL: 'https://api.openweathermap.org/data/2.5/weather',
  timeout: 1000,
});

exports.getWeatherEmoji = function getWeatherEmoji(weatherID) {
    const thunderstorm = "\u{1F4A8}"    // Code: 200's, 900, 901, 902, 905
    const drizzle = "\u{1F4A7}"         // Code: 300's
    const rain = "\u{02614}"            // Code: 500's
    const snowflake = "\u{02744}"       // Code: 600's snowflake
    const snowman = "\u{026C4}"         // Code: 600's snowman, 903, 906
    const atmosphere = "\u{1F301}"      // Code: 700's foogy
    const clearSky = "\u{02600}"        // Code: 800 clear sky
    const fewClouds = "\u{026C5}"       // Code: 801 sun behind clouds
    const clouds = "\u{02601}"          // Code: 802-803-804 clouds general
    const hot = "\u{1F525}"             // Code: 904
    const defaultEmoji = "\u{1F300}"    // default emojis

    if (weatherID) {
      weatherID = weatherID.toString()
      if (
        weatherID.charAt(0) == '2' ||
        weatherID == '900' ||
        weatherID == '901' ||
        weatherID == '902' ||
        weatherID == '905'
      ) {
        return thunderstorm;
      } else if (weatherID.charAt(0) == '3') {
        return drizzle;
      } else if (weatherID.charAt(0) == '5') {
        return rain;
      } else if (
        weatherID.charAt(0) == '6' ||
        weatherID == '903' ||
        weatherID == '906'
      ) {
        return snowflake + ' ' + snowman;
      } else if (weatherID.charAt(0) == '7') {
        return atmosphere;
      } else if (weatherID == '800') {
        return clearSky;
      } else if (weatherID == '801') {
        return fewClouds;
      } else if (
        weatherID == '802' ||
        weatherID == '803' ||
        weatherID == '804'
      ) {
        return clouds;
      } else if (weatherID == '904') {
        return hot;
      } else return defaultEmoji;
    }

    return defaultEmoji
}

exports.queryCurrentWeather = async function queryCurrentWeather(query) {
  const response = await openWeatherAxios.get('', {
    params: {
      q: query,
      appid: process.env.WEATHER_KEY,
      units: 'imperial',
    }
  });

  return response.data
};
