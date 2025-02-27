var fs = require('fs')
var http = require('http')
var zlib = require('zlib')
var tar = require('tar')
var Joke = require('joke')
var request = require('request')
var elasticstream = require('elasticstream')
var bodyJson = require('body/json')
var sendJson = require('send-data/json')
var Router = require('routes-router')
var errors = require('./errors.js')
var sendError = require('./send-error.js')
var Importer = require('./importer.js')

var config = JSON.parse(fs.readFileSync(process.argv[2]))

var log = new Joke()
log.pipe(Joke.stringify()).pipe(process.stdout)
log.info('npmco.de-indexer starting')

function index(req, res, opts) {
  bodyJson(req, res, function (err, body) {
    if (err) return sendError(req, res, err)

    var name = body.name
    var version = body.version
    request({
      url: body.registry || config.registry + '/' + name,
      json: true
    }, function (err, res_, body) {
      if (err) return sendError(req, res, err)
      if (res_.statusCode === 404)
        return sendError(req, res, errors.PackageNotFound(name))
      if (res_.statusCode !== 200)
        return sendError(req, res, errors.UknownUpstreamError(res.statusCode, body))

      var versionObj = body.versions[version]
      if (!versionObj)
        return sendError(req, res, errors.VersionNotFound(name, version))

      var importer = Importer({
        name: name,
        version: version,
        author: versionObj._npmUser.name
      })

      request(versionObj.dist.tarball)
        .pipe(zlib.createGunzip())
        .pipe(tar.Parse())
        .pipe(importer)
        .pipe(elasticstream({ index: 'files', type: 'file' }))
        .on('error', function (err) {
          log.error('indexing error', err);
        });

      // TODO: we should wait until indexing is over and report any potential
      // errors, but the elasticstream never ends, so we'd have to catch the
      // end of importer, but I'm lazy now.
      res.writeHead(201);
      res.end();
    });
  })
}

function unindex(req, res, opts) {
  bodyJson(req, res, function (err, body) {
    if (err) return sendError(req, res, err)

    var name = body.name
    if (!name)
      return sendError(req, res, errors.BadRequest('Package name (`name`) is required'))

    // TODO: make unindexing by version work

    request({
      url: config.elasticsearch + '/files/file/_query',
      json: true,
      method: 'DELETE',
      body: {
        query: {
          filtered: {
            filter: {
              term: { package: name }
            }
          }
        }
      }
    }, function (err, res_, body) {
      if (err) return sendError(req, res, err)

      if (res_.statusCode !== 200)
        return sendError(req, res, errors.UnknownUpstreamError(res_.statusCode))

      res.writeHead(201)
      res.end()
    })
  })
}

var router = new Router()

router.addRoute('/index', {
  POST: index
})

router.addRoute('/unindex', {
  POST: unindex
})

var server = http.createServer(function (req, res) {
  log.info('request', { method: req.method, url: req.url, ip: req.socket.remoteAddress })
  router.call(this, req, res)
})

server.listen(config.port || 8008, config.host || '127.0.0.1', function () {
  log.info('npmco.de-indexer listening on ' + server.address().port)
})
