exports.BadRequest = function (msg) {
  var err = new Error(msg || 'Bad request')
  err.statusCode = 400
  err.code = 'EBADREQUEST'
  return err
}

exports.NotFound = function (msg) {
  var err = new Error(msg || 'Not found')
  err.statusCode = 404
  err.code = 'ENOTFOUND'
  return err
}

exports.PackageNotFound = function (packageName) {
  return exports.NotFound('Package not found: ' + packageName)
}

exports.VersionNotFound = function (packageName, version) {
  return exports.NotFound('Version not found: ' + packageName + '@' + version)
}

exports.UnknownUpstreamError = function (statusCode) {
  var err = new Error('Unknown upstream error: ' + statusCode)
  err.statusCode = 500
  err.code = 'EUNKNOWNUPSTREAM'
  return err
}
