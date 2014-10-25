var zlib = require('zlib'),
    http = require('http'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    events = require('events'),
    stream = require('stream'),
    tar = require('tar');

var Importer = module.exports = function (options) {
  if (!(this instanceof Importer)) {
    return new Importer(options);
  }

  this.name = options.name;
  this.version = options.version;
  this.elasticsearch = options.elasticsearch;

  stream.Duplex.call(this, { objectMode: true });
};
util.inherits(Importer, stream.Duplex);

Importer.prototype.add = function (entry) {
  var data = '',
      hash = crypto.createHash('sha256'),
      self = this;

  if (path.extname(entry.path) !== '.js') {
    return;
  }

  hash.update(entry.path);

  entry.on('data', function (chunk) {
    data += chunk.toString('utf8');
  });

  entry.on('end', function () {
    self.push({
      id: self.name + '-' + hash.digest('hex'),
      doc: {
        package: self.name,
        version: self.version,
        filename: entry.path,
        content: data
      }
    });
  });
};

Importer.prototype._read = function () {
};

Importer.prototype._write = function (chunk, encoding, cb) {
  cb();
};
