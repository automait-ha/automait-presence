module.exports = owntracks

var mqtt = require('mqtt')
  , haversine = require('haversine')
  , findWhere = require('lodash.findwhere')

function owntracks() {
  var client = mqtt.connect('mqtt://microadam:adamjd1@microadam.co.uk:8883')

  client.on('connect', function () {
    client.subscribe('owntracks/#')
  })

  client.on('message', function (topic, message) {
    var data = JSON.parse(message.toString())
      , isNotPing = !data.t || (data.t && data.t !== 'p')

    if (data && data._type === 'location' && data.lat && data.lon && data.tid && data.tst, isNotPing) {
      var person = findWhere(this.config.people, { owntracksId: data.tid })
        , now = new Date()
        , messageTime = new Date(data.tst * 1000)
        , messageTimeAgo = now.getTime() - messageTime.getTime()

      if (!person || messageTimeAgo > 300000) return
      this.config.locations.forEach(function (location) {
        var locationLatLon = { latitude: location.latitude, longitude: location.longitude }
          , personLatLong = { latitude: data.lat, longitude: data.lon }
          , distanceFromLocation = haversine(locationLatLon, personLatLong, { unit: 'km' }) * 1000
          , isAtLocation = this.presence[location.name].people[person.name]
          , eventName = 'change:location:' + location.name + ':person:' + person.name + ':'

        if (distanceFromLocation <= 25 && !isAtLocation) {
          this.presence[location.name].people[person.name] = true
          // this.logger.info(person.name, 'arriving')
          eventName += 'arriving'
          this.emit(eventName, this.presence)
          this.determineMainPresenceState(location.name)
        } else if (distanceFromLocation > 25 && isAtLocation) {
          this.presence[location.name].people[person.name] = false
          // this.logger.info(person.name, 'leaving')
          eventName += 'leaving'
          this.emit(eventName, this.presence)
          this.determineMainPresenceState(location.name)
        }

      }.bind(this))
    }
  }.bind(this))

}
