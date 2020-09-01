const restify = require('restify')
const port = process.env.PORT || 8080

var server = restify.createServer()

server.get('/', function respond(req, res, next) {
  res.send('Honk')
  return next()
})

exports.startServer = function startServer() {
  server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url)
  })
}

