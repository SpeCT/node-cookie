var tough = require('./cookie');
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');
var fs = require('fs');

function JSONFileCookieStore(filename) {
  this.idx = {};
  this.filename = filename != null ? filename : ".tcjar";
  // load cookies
  try {
    json_str = fs.readFileSync(this.filename, "utf-8");
    if (!json_str) return;
    json_cookies = json_str.split("\n");
    for (var i = 0; i < json_cookies.length; i++) {
      this.putCookie(tough.fromJSON(json_cookies[i]), function() {});
    }
  } catch (err) {
    if (err.errno != 34) throw err;
  }
}
module.exports.JSONFileCookieStore = JSONFileCookieStore;
JSONFileCookieStore.prototype.idx = null;

// force a default depth:
JSONFileCookieStore.prototype.inspect = function inspect() {
  return "{ idx: "+util.inspect(this.idx, false, 2)+' }';
};

JSONFileCookieStore.prototype.findCookie = function findCookie(domain, path, key, cb) {
  if (!this.idx[domain]) return cb(null,undefined);
  if (!this.idx[domain][path]) return cb(null,undefined);
  return cb(null,this.idx[domain][path][key]||null);
};

JSONFileCookieStore.prototype.findCookies = function findCookies(domain, path, cb) {
  var results = [];
  if (!domain || !path) return cb(null,[]);

  var domains = permuteDomain(domain)||[domain], dlen = domains.length;
  var paths = permutePath(path), plen = paths.length;
  for (var i=0; i<dlen; i++) {
    var curDomain = domains[i];
    var domainIndex = this.idx[curDomain];
    if (!domainIndex) continue;
    for (var j=0; j<plen; j++) {
      var curPath = paths[j];
      var pathIndex = domainIndex[curPath];
      if (!pathIndex) continue;
      for (var key in pathIndex) {
        results.push(pathIndex[key]);
      }
    }
  }
  cb(null,results);
};

JSONFileCookieStore.prototype.putCookie = function putCookie(cookie, cb) {
  if (!this.idx[cookie.domain]) this.idx[cookie.domain] = {};
  if (!this.idx[cookie.domain][cookie.path]) this.idx[cookie.domain][cookie.path] = {};
  this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
  this._write_store(cb);
};

JSONFileCookieStore.prototype.updateCookie = function updateCookie(oldCookie, newCookie, cb) {
  // updateCookie() may avoid updating cookies that are identical.  For example,
  // lastAccessed may not be important to some stores and an equality
  // comparison could exclude that field.
  this.putCookie(newCookie,cb);
};

JSONFileCookieStore.prototype.removeCookie = function removeCookie(domain, path, key, cb) {
  if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
    delete this.idx[domain][path][key];
  }
  this._write_store(cb);
};

JSONFileCookieStore.prototype.removeCookies = function removeCookies(domain, path, cb) {
  if (!this.idx[domain]) {
    if (path) {
      delete this.idx[domain][path];
    } else {
      delete this.idx[domain];
    }
  }
  this._write_store(cb);
};

JSONFileCookieStore.prototype._write_store = function(cb) {
  var json_cookies = [];
  for (domain in this.idx) {
    for (path in this.idx[domain]) {
      for (key in this.idx[domain][path]) {
        json_cookies.push(JSON.stringify(this.idx[domain][path][key]));
      }
    }
  }
  fs.writeFile(this.filename, json_cookies.join("\n"), "utf-8", function(err){
    cb && cb(err)
  });
}
