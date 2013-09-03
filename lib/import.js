var zlib = require('zlib'),
    http = require('http'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    events = require('events'),
    tar = require('tar'),
    uuid = require('node-uuid'),
    hyperquest = require('hyperquest'),
    jsonquest = require('jsonquest');

module.exports = function (options) {
  var importer = new Importer(options);
  importer.import();
  return importer;
};

var Importer = module.exports.Importer = function (options) {
  this.name = options.name;
  this.version = options.version;
  this.elasticsearch = options.elasticsearch;

  events.EventEmitter.call(this);
};
util.inherits(Importer, events.EventEmitter);

Importer.prototype._processEntry = function (entry, callback) {
  var data = '',
      self = this;

  if (path.extname(entry.path) !== '.js') {
    return;
  }

  entry.on('data', function (chunk) {
    data += chunk.toString('utf8');
  });

  entry.on('end', function () {
    self.put(entry.path, data, callback);
  });
};

Importer.prototype.put = function (filename, data, callback) {
  jsonquest({
    host: this.elasticsearch.host,
    port: this.elasticsearch.port,
    method: 'PUT',
    path: '/files/file/' + uuid.v4(),
    body: {
      package: this.name,
      version: this.version,
      filename: filename,
      content: data
    }
  }, function (err, res, content) {
    if (err) {
      return callback(err);
    }

    if (res.statusCode !== 201) {
      return callback(new Error('ElasticSearch error (' + res.statusCode + ')'));
    }

    callback();
  });
};

Importer.prototype.import = function () {
  var name = this.name,
      version = this.version,
      self = this;

  var request = http.request({
    host: 'registry.npmjs.org',
    path: '/' + name + '/-/' + name + '-' + version + '.tgz'
  });

  request.end();

  request.on('response', function (res) {
    var errors = [];

    if (res.statusCode !== 200) {
      return self.emit('done', new Error('npm error (' + res.statusCode + ')'));
    }

    res
      .pipe(zlib.createGunzip())
      .pipe(tar.Parse())
      .on('entry', function (entry) {
        self.emit('entry', entry);
        self._processEntry(entry, function (err) {
          if (err) {
            errors.push(err);
          }
        });
      })
      .on('end', function () {
        var err;
        if (errors.length) {
          err = new Error('Errors occured while importing');
          err.errors = err;
          self.emit('done', err);
        }
        self.emit('done');
      });
  });
};
