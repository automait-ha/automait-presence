var assert = require('assert')
  , init = require('../index')
  , logger = { info: function() {} }
  , config = require('./fixtures/mock-config.json')

describe('presence', function () {

  it('should work for setLocationOccupied', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()

      var homeOccupied = false
        , homeVacant = false

      presence.on('location:Home:occupied', function () {
        homeOccupied = true
      })
      presence.on('location:Home:vacant', function () {
        homeVacant = true
      })

      presence.setLocationOccupied('Home', true, function (error) {
        if (error) return done(error)
        assert.equal(presence.presence.Home.occupied, true, 'home should be occupied')
        assert.equal(homeOccupied, true, 'home occupied should have been emitted')
        presence.setLocationOccupied('Home', false, function (error) {
          if (error) return done(error)
          assert.equal(presence.presence.Home.occupied, false, 'home should not be occupied')
          assert.equal(homeVacant, true, 'home vacant should have been emitted')
          done()
        })
      })
    })
  })

  it('should work for setZoneOccupied', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()

      var cornerOccupied = false
        , bedroomOccupied = false
        , upstairsOccupied = false
        , homeOccupied = false
        , upstairsVacant = false
        , bedroomVacant = false
        , homeVacant = false
        , cornerVacant = false

      presence.on('location:Home:zone:Upstairs:zone:Bedroom:zone:Corner:occupied', function () {
        cornerOccupied = true
      })
      presence.on('location:Home:zone:Upstairs:zone:Bedroom:occupied', function () {
        bedroomOccupied = true
      })
      presence.on('location:Home:zone:Upstairs:occupied', function () {
        upstairsOccupied = true
      })
      presence.on('location:Home:occupied', function () {
        homeOccupied = true
      })
      presence.on('location:Home:vacant', function () {
        homeVacant = true
      })
      presence.on('location:Home:zone:Upstairs:vacant', function () {
        upstairsVacant = true
      })
      presence.on('location:Home:zone:Upstairs:zone:Bedroom:vacant', function () {
        bedroomVacant = true
      })
      presence.on('location:Home:zone:Upstairs:zone:Bedroom:zone:Corner:vacant', function () {
        cornerVacant = true
      })

      presence.setZoneOccupied('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], true, function (error) {
        if (error) return done(error)
        assert.equal(presence.presence.Home.zones.Upstairs.zones.Bedroom.zones.Corner.occupied
        , true
        , 'corner should be occupied'
        )
        assert.equal(presence.presence.Home.zones.Upstairs.zones.Bedroom.occupied
        , true
        , 'bedroom should be occupied'
        )
        assert.equal(presence.presence.Home.zones.Upstairs.occupied
        , true
        , 'upstairs should be occupied'
        )
        assert.equal(presence.presence.Home.occupied
        , true
        , 'home should be occupied'
        )
        assert.equal(cornerOccupied, true, 'corner occupied should have been emitted')
        assert.equal(bedroomOccupied, true, 'bedroom occupied should have been emitted')
        assert.equal(upstairsOccupied, true, 'upstairs occupied should have been emitted')
        assert.equal(homeOccupied, true, 'home occupied should have been emitted')
        presence.setZoneOccupied('Home', [], false, function (error) {
          if (error) return done(error)
          assert.equal(presence.presence.Home.zones.Upstairs.zones.Bedroom.zones.Corner.occupied
          , false
          , 'corner should be vacant'
          )
          assert.equal(presence.presence.Home.zones.Upstairs.zones.Bedroom.occupied
          , false
          , 'bedroom should be vacant'
          )
          assert.equal(presence.presence.Home.zones.Upstairs.occupied
          , false
          , 'upstairs should be vacant'
          )
          assert.equal(presence.presence.Home.occupied
          , false
          , 'home should be vacant'
          )
          assert.equal(cornerVacant, true, 'corner vacant should have been emitted')
          assert.equal(bedroomVacant, true, 'bedroom vacant should have been emitted')
          assert.equal(upstairsVacant, true, 'upstairs vacant should have been emitted')
          assert.equal(homeVacant, true, 'home vacant should have been emitted')
          done()
        })
      })
    })
  })

  it.skip('should work for setPersonAtLocation', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.setPersonAtLocation('Home', 'Adam', true, function (error) {
        if (error) return done(error)
        presence.setPersonAtLocation('Home', 'Adam', false, function (error) {
          if (error) return done(error)
          done()
        })
      })
    })
  })

  it.skip('should work for setPersonInZone', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.setPersonInZone('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], 'Adam', true, function (error) {
        if (error) return done(error)
        presence.setPersonInZone('Home', [], 'Adam', false, function (error) {
          if (error) return done(error)
          done()
        })
      })
    })
  })

  it.skip('should work for serPersonInZone twice with no reset', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.setPersonInZone('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], 'Adam', true, function (error) {
        if (error) return done(error)
        presence.setPersonInZone('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], 'Emma', true, function (error) {
          if (error) return done(error)
          presence.setPersonInZone('Home', [], 'Adam', false, function (error) {
            if (error) return done(error)
            done()
          })
        })
      })
    })
  })

  it.skip('should work for setPersonInZone twice with reset', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.setPersonInZone('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], 'Adam', true, function (error) {
        if (error) return done(error)
        presence.setPersonInZone('Home', [ 'Upstairs', 'Bedroom', 'Corner' ], 'Emma', true, function (error) {
          if (error) return done(error)
          presence.setPersonInZone('Home', [], 'Adam', false, function (error) {
            if (error) return done(error)
            presence.setPersonInZone('Home', [], 'Emma', false, function (error) {
              if (error) return done(error)
              done()
            })
          })
        })
      })
    })
  })

  it.skip('should increment zone occupancy count when outer zone boundary is broken before inner', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.breakOuterZoneBoundary('Home', [ 'Upstairs' ], function (error) {
        if (error) return done(error)
        setTimeout(function () {
          presence.breakInnerZoneBoundary('Home', [ 'Upstairs' ], function (error) {
            if (error) return done(error)
            done()
          })
        }, 1000)
      })
    })
  })

  it.skip('should decrement zone occupancy count when inner zone boundary is broken before outer', function (done) {
    init(function (error, name, Presence) {
      var presence = new Presence(null, logger, config)
      presence.init()
      presence.breakInnerZoneBoundary('Home', [ 'Upstairs' ], function (error) {
        if (error) return done(error)
        setTimeout(function () {
          presence.breakOuterZoneBoundary('Home', [ 'Upstairs' ], function (error) {
            if (error) return done(error)
            done()
          })
        }, 1000)
      })
    })
  })

})
