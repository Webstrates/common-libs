"use strict";

var Permissions = function () {

  this.version = "0.0.1";

  /**
   * Get permissions object of current document.
   */
  var getPermissions = function getPermissions() {
    var htmlElement = document.documentElement;
    var auth = htmlElement.dataset.auth;
    return auth ? JSON.parse(auth) : [];
  };

  /**
   * Applies permissions to current document.
   * 
   * @param [] auth Array containing document permissions (e.g., [{username:"raedle",
   * provider:"github",permissions:"rw"}.{username:"anonymous",provider:"",
   * permissions:"r"}])
   */
  var applyPermissions = function applyPermissions(auth) {
    var htmlElement = document.documentElement;

    if (auth && auth.length) {
      htmlElement.dataset.auth = JSON.stringify(auth);
    } else {
      clearPermissions();
    }
  };

  /**
   * Clear all document permissions aka. removes data-auth attribute.
   */
  var clearPermissions = function clearPermissions() {
    var htmlElement = document.documentElement;
    delete htmlElement.dataset.auth;
  };
  /**
   * Grant permissions to username using the given authentication provider.
   * 
   * @param String username Username of user that is granted specific permissions to
   * the current document.
   * @param String permissions Document permissions for username (e.g., "r" or "rw").
   * @param String provider="" Authentication provider, e.g., "github" for GitHub.
   */
  this.grant = function (username, permissions) {
    var provider = arguments.length <= 2 || arguments[2] === undefined ? "" : arguments[2];

    var auth = getPermissions();
    var userPermission = auth.find(function (item) {
      return item.username === username && item.provider === provider;
    });
    if (userPermission) {
      userPermission.permissions = permissions;
    } else {
      auth.push({
        username: username,
        provider: provider,
        permissions: permissions
      });
    }

    applyPermissions(auth);
  };

  /**
   * @param String username Revoke permissions for username.
   * @param String provider="" Revoke permissions given the particular authentication provider.
   */
  this.revoke = function (username) {
    var provider = arguments.length <= 1 || arguments[1] === undefined ? "" : arguments[1];

    var auth = getPermissions();
    var permissionIndex = auth.findIndex(function (item) {
      return item.username === username && item.provider === provider;
    });
    if (permissionIndex > -1) {
      auth.splice(permissionIndex, 1);
    }
    applyPermissions(auth);
  };

  /**
   * List permissions of current document.
   */
  this.list = function () {
    var auth = getPermissions();
    console.log("Document permissions");
    auth.forEach(function (_ref) {
      var username = _ref.username;
      var permissions = _ref.permissions;
      var provider = _ref.provider;

      console.log("Username %s has %s permissions using %s provider.", username, permissions, provider);
    });
  };

  return this;
}.call({});

/**
 * Once the webstrate loaded, add the permission helper to the webstrate
 * object.
 */
webstrate.on('loaded', function () {
  window.webstrate.permissions = Permissions;
});