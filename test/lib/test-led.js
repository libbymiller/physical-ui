/* globals describe, it, before, beforeEach */
'use strict';

var chai   = require('chai'),
    assert = chai.assert,
    sinon  = require('sinon');

var subject = require('../../lib/led'),
    wpiMock = require('../../lib/wiring-pi-mock');

describe('LED', function () {
  beforeEach(function () {
    // Create a wiring-pi mock where each method is a spy
    this.wpi = wpiMock.create(function () { return sinon.spy(); });
  });

  describe('.create', function () {
    it('calls wpi.setup and sets pin mode', function () {
      subject.create(9, { wpi: this.wpi });
      assert.ok( this.wpi.setup.called );
      assert.ok( this.wpi.pinMode.calledWith(9, this.wpi.OUTPUT) );
    });
  });

  describe('#on', function () {
    it('turns LED on', function () {
      var led = subject.create(9, { wpi: this.wpi });
      led.on();
      assert.ok( this.wpi.digitalWrite.calledWith(9, 1) );
    });
    it('sends correct signal when reversed', function () {
      var led = subject.create(9, { reverse:true, wpi: this.wpi });
      led.on();
      assert.ok( this.wpi.digitalWrite.calledWith(9, 0) );
    });
    it('returns self for chaining', function () {
      var led = subject.create(9, { wpi: this.wpi });
      assert.equal( led.on(), led );
    });
  });

  describe('#off', function () {
    it('turns LED off', function () {
      var led = subject.create(9, { wpi: this.wpi });
      led.off();
      assert.ok( this.wpi.digitalWrite.calledWith(9, 0) );
    });
    it('sends correct signal when reversed', function () {
      var led = subject.create(9, { reverse:true, wpi: this.wpi });
      led.off();
      assert.ok( this.wpi.digitalWrite.calledWith(9, 1) );
    });
    it('returns self for chaining', function () {
      var led = subject.create(9, { wpi: this.wpi });
      assert.equal( led.off(), led );
    });
  });

  describe('#destroy', function () {
    it('turns LED off', function () {
      var led = subject.create(9, { wpi: this.wpi });
      led.destroy();
      assert.ok( this.wpi.digitalWrite.calledWith(9, 0) );
    });
    it('does not allow chaining', function () {
      var led = subject.create(9, { wpi: this.wpi });
      assert.notEqual( led.destroy(), led );
    });
    // it('ensures LED cannot be turned back on', function () {
    //   var led = subject.create(9, { wpi: this.wpi });
    //   led.destroy();
    //   led.on();
    //   assert.throws(function (){
    //     led.on();
    //   });
    // });
  });
});