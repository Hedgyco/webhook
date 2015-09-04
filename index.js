var http = require('http')
var createHandler = require('github-webhook-handler')
var handler = createHandler({ path: '/webhook', secret: 'myhashsecret' })
var is_handled = false
var spawn = require('child_process').spawn;
var child
setInterval(function() {
  is_handled = false
}, 60000)

http.createServer(function (req, res) {
  handler(req, res, function (err) {
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(7777)

handler.on('error', function (err) {
  console.error('Error:', err.message)
})

handler.on('push', function (event) {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref)
  if(!is_handled) {
    child = spawn('salt-run', ['fileserver.update'])
    child.stdout.on('data', function(chunk) {
      console.log('stdout: ' + chunk);
    });
    child.stderr.on('data', function(data) {
      console.log('stderr: ' + data);
    });
    child.on('close', function(code) {
      c = spawn('salt', ['kiss', 'state.apply', 'kiss.git']);
      c.stdout.on('close', function() {
        t = spawn('salt', ['kiss', 'state.apply', 'kiss.boot']);
        setTimeout(function() {
          t.kill()
        }, 2000)
      })
      child = spawn('salt', ['qa', 'state.apply', 'qa.git']);
      child.stdout.on('data', function(chunk) {
        console.log('stdout: ' + chunk);
      });
      console.log('closing code: ' + code);
    });
  }
  is_handled = true

})

handler.on('issues', function (event) {
  console.log('Received an issue event for %s action=%s: #%d %s',
    event.payload.repository.name,
    event.payload.action,
    event.payload.issue.number,
    event.payload.issue.title)
})
