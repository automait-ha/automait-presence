module.exports = dhcp

var et = require('expect-telnet')
  , ping = require ('ping')

function dhcp() {

  this.config.locations.forEach(function (location) {
    run.call(this, location.name, location.dhcpCheck)
  }.bind(this))

  function run(locationName, dhcpCheckConfig) {

    var people = {}
      , macToPerson = {}
      , macToTimeout = {}

    this.config.people.forEach(function (person) {
      macToPerson[person.macAddress] = person.name
      macToTimeout[person.macAddress] = person.dhcpTimeout
      people[person.name] = { lastSeen: null }
    })

    execute.call(this)
    setInterval(execute.bind(this), 5000)

    function execute() {
      et(dhcpCheckConfig.telnetIp + ':' + dhcpCheckConfig.telnetPort
      , [ { expect: dhcpCheckConfig.usernamePrompt, send: dhcpCheckConfig.username + '\r' }
        , { expect: dhcpCheckConfig.passwordPrompt, send: dhcpCheckConfig.password + '\r' }
        , { expect: '#', send: 'arp -a\r' }
        , { expect: '#', out: parseOutput.bind(this), send: 'exit\r' }
        ]
      , function(error) {
          if (error) console.error(error)
        }
      )
    }

    function parseOutput(output) {
      var lines = output.split('\n')
        , macAddresses = []
        , macsToIps = {}

      lines.forEach(function (line) {
        var parts = line.split(' ')
          , ip = parts[1].replace('(', '').replace(')', '')
          , mac = parts[3]

        macAddresses.push(mac)
        macsToIps[mac] = ip
      })

      var toFind = Object.keys(macToPerson)
      toFind.forEach(function (deviceId) {
        var isHome = this.presence[locationName].people[macToPerson[deviceId]]
          , lastSeen = people[macToPerson[deviceId]].lastSeen
          , found = macAddresses.indexOf(deviceId) > -1
          , timeout = macToTimeout[deviceId] || 600000
          , macHandled = determineLeaving.call(this, found, isHome, lastSeen, deviceId, timeout, 'no mac found')

        if (!macHandled && found) {
          var ip = macsToIps[deviceId]
          ping.sys.probe(ip, function (isAlive) {
            if (lastSeen && isAlive) {
              this.logger.info(macToPerson[deviceId], 'found')
              people[macToPerson[deviceId]].lastSeen = null
            }
            var ipHandled = determineLeaving.call(this, isAlive, isHome, lastSeen, deviceId, timeout, 'unreachable')

            if (!ipHandled && !isHome && isAlive) {
              this.presence[locationName].people[macToPerson[deviceId]] = true
              this.logger.info((new Date()).toString(), macToPerson[deviceId], 'arriving...')
              var eventName = 'change:location:' + locationName + ':person:' + macToPerson[deviceId] + ':arriving'
              this.emit(eventName, this.presence)
              this.determineMainPresenceState(locationName)
            }
          }.bind(this))
        }
      }.bind(this))
    }

    function determineLeaving(found, isHome, lastSeen, deviceId, timeout, reason) {
      var now = (new Date()).getTime()
      if (!found && isHome && !lastSeen) {
        this.logger.info((new Date()).toString(), macToPerson[deviceId], 'maybe leaving...')
        people[macToPerson[deviceId]].lastSeen = now
        return true
      } else if (!found && isHome && lastSeen && now - lastSeen >= timeout) {
        this.presence[locationName].people[macToPerson[deviceId]] = false
        this.logger.info(macToPerson[deviceId], 'leaving...(' + reason + ')')
        var eventName = 'change:location:' + locationName + ':person:' + macToPerson[deviceId] + ':leaving'
        this.emit(eventName, this.presence)
        this.determineMainPresenceState(locationName)
        return true
      }
      return false
    }

  }

}
