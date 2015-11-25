module.exports = init

var Emitter = require('events').EventEmitter
  , dhcpChecker = require('./lib/dhcp')
  , owntracksChecker = require('./lib/owntracks')

function init(callback) {
  callback(null, 'presence', Presence)
}

function Presence(automait, logger, config) {
  Emitter.call(this)
  this.automait = automait
  this.logger = logger
  this.config = config
  this.eventLastEmitTimes = {}
}

Presence.prototype = Object.create(Emitter.prototype)

Presence.prototype.init = function () {
  this.presence = setInitialPresence.call(this, this.config)
  this.startDhcpCheck()
  this.startOwntracksCheck()
}

Presence.prototype.emit = function (eventName) {
  var eventParts = eventName.split(':')
  eventParts.pop()
  var eventPrefix = eventParts.join(':')
    , now = (new Date()).getTime()
    , lastEmitTime = this.eventLastEmitTimes[eventPrefix]

  if (!lastEmitTime || now - lastEmitTime >= 60000) {
    this.eventLastEmitTimes[eventPrefix] = now
    return Emitter.prototype.emit.apply(this, arguments)
  }

}

Presence.prototype.startDhcpCheck = dhcpChecker

Presence.prototype.startOwntracksCheck = owntracksChecker

Presence.prototype.isOccupied = function (locationName, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location'))
  callback(null, this.presence[locationName].presence)
}

Presence.prototype.isPersonAt = function (personName, locationName, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location'))
  callback(null, this.presence[locationName].people[personName])
}

Presence.prototype.determineMainPresenceState = function (locationName) {
  var beforeState = this.presence[locationName].presence
  this.presence[locationName].presence = false
  Object.keys(this.presence[locationName].people).some(function (name) {
    if (this.presence[locationName].people[name]) {
      this.presence[locationName].presence = true
      return true
    }
    return false
  }.bind(this))
  var eventName = 'change:location:' + locationName + ':'
  if (!beforeState && this.presence[locationName].presence) {
    this.emit(eventName + 'occupied', this.presence)
  } else if (beforeState && !this.presence[locationName].presence) {
    this.emit(eventName + 'vacant', this.presence)
  }
}

function setInitialPresence(config) {
  var state = {}
  config.locations.forEach(function (location) {
    var locationState = { presence: false, people: {}, zones: {} }
    location.zones.forEach(function (zone) {
      var zoneState = { presence: false, people: {} }
      locationState.zones[zone] = zoneState
      config.people.forEach(function (person) {
        zoneState.people[person.name] = false
      })
    })
    config.people.forEach(function (person) {
      locationState.people[person.name] = false
    })
    state[location.name] = locationState
  })
  return state
}
