const axios = require('axios');

exports.fetchColor = async (hex) => {
  try {
    const response = await axios.get('http://thecolorapi.com/id', {
      params: {
        hex
      }
    })

    if (response.data.hsl) {
      return response.data.hsl
    }
  return undefined
  } catch (error) {
    return undefined
  }
}
