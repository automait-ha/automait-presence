module.exports = init

var Emitter = require('events').EventEmitter
  , async = require('async')

function init(callback) {
  callback(null, 'presence', Presence)
}

function Presence(automait, logger, config) {
  Emitter.call(this)
  this.automait = automait
  this.logger = logger
  this.config = config
  // this.eventLastEmitTimes = {}
  this.zoneBoundaryBreakTimes = {}
}

Presence.prototype = Object.create(Emitter.prototype)

Presence.prototype.init = function () {
  this.presence = setInitialPresence.call(this, this.config)
}

// Presence.prototype.emit = function (eventName) {
//   var eventParts = eventName.split(':')
//   eventParts.pop()
//   var eventPrefix = eventParts.join(':')
//     , now = (new Date()).getTime()
//     , lastEmitTime = this.eventLastEmitTimes[eventPrefix]

//   if (!lastEmitTime || now - lastEmitTime >= 60000) {
//     this.eventLastEmitTimes[eventPrefix] = now
//     return Emitter.prototype.emit.apply(this, arguments)
//   } else {
//     this.logger.info('Presence event squelched:', eventName)
//   }
// }

// Getters

Presence.prototype.isLocationOccupied = function (locationName, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  callback(null, this.presence[locationName].occupied)
}

Presence.prototype.isZoneOccupied = function (locationName, zoneHierachy, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    callback(null, zone.occupied)
  })
}

Presence.prototype.isPersonAtLocation = function (locationName, personName, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  callback(null, this.presence[locationName].people[personName])
}

Presence.prototype.isPersonInZone = function (locationName, zoneHierachy, personName, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    callback(null, zone.people[personName])
  })
}

// Setters

Presence.prototype.setLocationOccupied = function (locationName, occupied, callback) {
  this.setZoneOccupied(locationName, [], occupied, callback)
}

Presence.prototype.setZoneOccupied = function (locationName, zoneHierachy, occupied, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    if (zone.occupied === occupied) return callback()

    this.emitChange(locationName, zoneHierachy, null, occupied)
    zone.occupied = occupied
    this.setOtherPresenceStates(locationName, zoneHierachy, null, occupied, callback)
  }.bind(this))
}

Presence.prototype.setPersonAtLocation = function (locationName, personName, present, callback) {
  this.setPersonInZone(locationName, [], personName, present, callback)
}

Presence.prototype.setPersonInZone = function (locationName, zoneHierachy, personName, present, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    if (zone.people[personName] === present) return callback()

    this.emitChange(locationName, zoneHierachy, personName, present)
    zone.people[personName] = present
    this.setOtherPresenceStates(locationName, zoneHierachy, personName, present, callback)
  }.bind(this))
}

Presence.prototype.incrementZoneOccupancyCount = function (locationName, zoneHierachy, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    zone.occupancyCount = zone.occupancyCount + 1

    if (zone.occupancyCount - 1 === 0) {
      this.setZoneOccupied(locationName, zoneHierachy, true, callback)
    } else {
      callback()
    }
  }.bind(this))
}

Presence.prototype.decrementZoneOccupancyCount = function (locationName, zoneHierachy, callback) {
  if (!this.presence[locationName]) return callback(new Error('Unknown location: ' + locationName))
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    if (zone.occupancyCount === 0) return callback()
    zone.occupancyCount = zone.occupancyCount - 1

    if (zone.occupancyCount === 0) {
      this.setZoneOccupied(locationName, zoneHierachy, false, callback)
    } else {
      callback()
    }
  }.bind(this))
}

Presence.prototype.breakOuterZoneBoundary = function (locationName, zoneHierachy, callback) {
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    var innerZoneBoundaryBreakTime = this.zoneBoundaryBreakTimes[zone.name + ':inner']
      , now = Date.now()
      , timeDiff = now - innerZoneBoundaryBreakTime

    if (innerZoneBoundaryBreakTime && timeDiff <= zone.zoneBoundaryBreakSeparationTime) {
      delete this.zoneBoundaryBreakTimes[zone.name + ':outer']
      delete this.zoneBoundaryBreakTimes[zone.name + ':inner']
      this.decrementZoneOccupancyCount(locationName, zoneHierachy, callback)
    } else {
      this.zoneBoundaryBreakTimes[zone.name + ':outer'] = Date.now()
      callback()
    }
  }.bind(this))
}

Presence.prototype.breakInnerZoneBoundary = function (locationName, zoneHierachy, callback) {
  determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
    if (error) return callback(error)
    var outerZoneBoundaryBreakTime = this.zoneBoundaryBreakTimes[zone.name + ':outer']
      , now = Date.now()
      , timeDiff = now - outerZoneBoundaryBreakTime

    if (outerZoneBoundaryBreakTime && timeDiff <= zone.zoneBoundaryBreakSeparationTime) {
      delete this.zoneBoundaryBreakTimes[zone.name + ':outer']
      delete this.zoneBoundaryBreakTimes[zone.name + ':inner']
      this.incrementZoneOccupancyCount(locationName, zoneHierachy, callback)
    } else {
      this.zoneBoundaryBreakTimes[zone.name + ':inner'] = Date.now()
      callback()
    }
  }.bind(this))
}

Presence.prototype.emitChange = function (locationName, zones, personName, state) {
  var eventName = 'location:' + locationName
    , stateWord = 'vacant'

  if (zones) {
    zones.forEach(function (zone) {
      eventName += ':zone:' + zone
    })
  }
  if (personName) {
    stateWord = 'leaving'
    eventName += ':person:' + personName
    if (state) {
      stateWord = 'entering'
    }
  } else if (state) {
    stateWord = 'occupied'
  }
  eventName += ':' + stateWord

  this.emit(eventName)
}

Presence.prototype.setOtherPresenceStates = function (locationName, zoneHierachy, personName, state, cb) {
  if (!zoneHierachy) zoneHierachy = []
  var tasks = []

  if (state) {
    var hierachy = zoneHierachy.slice(0)
    if (personName) {
      tasks.push(this.incrementZoneOccupancyCount.bind(this, locationName, zoneHierachy))
      hierachy.pop()
      tasks.push(this.setPersonInZone.bind(this, locationName, hierachy, personName, state))
    } else {
      hierachy.pop()
      tasks.push(this.setZoneOccupied.bind(this, locationName, hierachy, state))
    }

    return async.parallel(tasks, cb)
  } else {
    return determineZoneFromHierachy(zoneHierachy, this.presence[locationName], function (error, zone) {
      if (error) return cb(error)

      if (!zoneHierachy.length && personName) {
        tasks.push(this.decrementZoneOccupancyCount.bind(this, locationName, zoneHierachy))
      }

      Object.keys(zone.zones).forEach(function (zoneName) {
        var hierachy = zoneHierachy.slice(0)
        hierachy.push(zoneName)
        if (personName) {
          tasks.push(this.setPersonInZone.bind(this, locationName, hierachy, personName, state))
          tasks.push(this.decrementZoneOccupancyCount.bind(this, locationName, hierachy))
        } else {
          tasks.push(this.setZoneOccupied.bind(this, locationName, hierachy, state))
        }
      }.bind(this))

      async.parallel(tasks, cb)
    }.bind(this))
  }
}

function setInitialPresence(config) {

  function formatZones(zones, parent) {
    if (!zones) return
    zones.forEach(function (zone) {
      var zoneState =
            { name: zone.name
            , occupied: false
            , people: {}
            , occupancyCount: 0
            , zones: {}
            , zoneBoundaryBreakSeparationTime: zone.zoneBoundaryBreakSeparationTime
            }
      parent.zones[zone.name] = zoneState
      config.people.forEach(function (person) {
        zoneState.people[person] = false
      })
      formatZones(zone.zones, zoneState)
    })
  }

  var state = {}
  config.locations.forEach(function (location) {
    var locationState =
          { name: location.name
          , occupied: false
          , people: {}
          , occupancyCount: 0
          , zones: {}
          , zoneBoundaryBreakSeparationTime: location.zoneBoundaryBreakSeparationTime
          }
    formatZones(location.zones, locationState)
    config.people.forEach(function (person) {
      locationState.people[person] = false
    })
    state[location.name] = locationState
  })

  return state
}

function determineZoneFromHierachy(zones, location, cb) {
  var matchedZone = location

  zones.forEach(function (zone) {
    if (matchedZone && matchedZone.zones[zone]) {
      matchedZone = matchedZone.zones[zone]
    } else {
      matchedZone = null
    }
  })

  if (!matchedZone) return cb(new Error('Unknown zones: ' + zones.join('.')))
  cb(null, matchedZone)
}
