import osc from 'osc'

let udpPort = null

export const sonicPi = {
  initUdpPort: () => {
    udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: 5000,
      metadata: true,
    })
    udpPort.open()
    udpPort.on('ready', function () {
      console.log('Connection ready to sonic-pi')
    })
  },
  sendUDPMessage: (address, message = '') => {
    const splits = message.split(',') // Returns ['40', '50', '5']

    // Build an array of integer from the comma seperated list of values
    // Returns [{ type: 'i', value: 40 }, { type: 'i', value: 50 }, { type: 'i', value: 5 }]
    const args = splits.reduce(function (acc, value) {
      // Value must be an integer
      const result = parseInt(value)

      if (!result) return acc

      // Push new integer value type that we plan to send
      acc.push({
        type: 'i',
        value: result,
      })

      return acc
    }, [])

    console.log('Send message %s to %s', JSON.stringify(args), address)

    // Send accumulated args to address, Sonic Pi
    udpPort.send(
      {
        address, // That channel were sending to
        args,
      },
      'localhost',
      4560, // Port Sonic Pi listens to
    )
  }
}

