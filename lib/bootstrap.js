var MessagingClient = require('radiodan-client').MessagingClient,
    logger = require('radiodan-client').utils.logger(__filename),
    failedPromiseHandler = require('radiodan-client').utils.failedPromiseHandler,
    components = ['buttons', 'rotaryEncoders', 'RGBLEDs'],
    Button = require('./button'),
    RotaryEncoder = require('./rotary-encoder'),
    RGB = require('./rgb'),
    instances = {},
    exchange = 'radiodan';

module.exports.start = function(config, opts) {
  config = config || {};
  if (config["host"]) {
    opts["host"] = config["host"];
  }
  instances.buttons = (config.buttons || []).map( supplyConfigAndOpts(createButtons, opts) );
  instances.rotaryEncoders = (config.rotaryEncoders || []).map( supplyConfigAndOpts(createEncoders, opts) );
  instances.rgbs = (config.RGBLEDs || []).map( supplyConfigAndOpts(createRGBLEDs, opts) );

  instances.buttons = objectify(instances.buttons);
  instances.rotaryEncoders = objectify(instances.rotaryEncoders);
  instances.rgbs = objectify(instances.rgbs);

  if (opts.repl) {
    require('./repl-socket').attach(opts.repl, instances);
  }
};

module.exports.stop = function() {
  destroyInstances(instances.buttons);
  destroyInstances(instances.rotaryEncoders);
  destroyInstances(instances.rgbs);
};

function destroyInstances(obj) {
  for( var key in obj ) {
    destroy( obj[key] );
  }
}

function destroy(component) {
  if (typeof component.destroy === 'function') {
    component.destroy();
  }
}

function supplyConfigAndOpts(fn, opts) {
  return function (config) {
    return fn.call(null, config, opts);
  };
}

function createButtons(config, opts) {
  var buttonOpts = clone(opts);
  var pinConfig = config.pins[0];
  var pin = (typeof pinConfig === 'number') ? pinConfig : pinConfig.pin;

  if (pinConfig.pull) { buttonOpts.pull = pinConfig.pull; }
  
  if (pinConfig.pressedIsHigh != null) {
    buttonOpts.pressedIsHigh = pinConfig.pressedIsHigh;
  }

  var messagingClient = MessagingClient.create(buttonOpts),
      topicKey = 'event.button.' + config.id,
      button,
      msg = { pressed: true };

  button = Button.create( pin, buttonOpts );

  console.log('setup button with: ', config);
  console.log('sending message to ', topicKey, msg);

  button.on('press', function () {
    console.log('button %s pressed', pin);
    messagingClient.sendToExchange(
      exchange, topicKey + '.press', { pressed: true }
    );
  });

  button.on('release', function () {
    console.log('button %s released', pin);
    messagingClient.sendToExchange(
      exchange, topicKey + '.release', { pressed: false }
    );
  });

  messagingClient.sendToExchange(exchange, topicKey, msg);

  return [config.id, button];
}

function createEncoders(config, opts) {  
  var encoderOpts = clone(opts);
  if (pinAConfig.pull) {
    encoderOpts.pullA = pinAConfig.pull;
  }

  if (pinBConfig.pull) {
    encoderOpts.pullB = pinBConfig.pull;
  }

  encoderOpts.algorithm = RotaryEncoder.algorithms.delta;
  encoderOpts.updateMethod = 'interrupt';

  var messagingClient = MessagingClient.create(encoderOpts),
      topicKey = 'event.rotary-encoder.' + config.id + '.turn',
      pinAConfig = config.pins[0],
      pinA = (typeof pinAConfig === 'number') ? pinAConfig : pinAConfig.pin, 
      pinBConfig = config.pins[1],
      pinB = (typeof pinBConfig === 'number') ? pinBConfig : pinBConfig.pin,
      encoder;

  encoder = RotaryEncoder.create(pinA, pinB, encoderOpts);

  console.log('setup encoder with: ', config);

  encoder.on('turn', function (evt) {
    var msg = { direction: evt.direction };
    console.log('sending message to ', topicKey, msg);
    messagingClient.sendToExchange(exchange, topicKey, msg);
  });

  return [config.id, encoder];
}

function createRGBLEDs(config, opts) {
  var rgbOpts = clone(opts);
  // Reverse the polarity of the neutron flow
  rgbOpts.reverse = true;

  var messagingClient = MessagingClient.create(rgbOpts),
      topicKey = 'command.rgb-led.' + config.id,
      msg = { emit: false, colour: [0,0,255] },
      rgb;

  rgb = RGB.create(config.pins, rgbOpts);

  console.log('setup led with: ', config);
  console.log('sending message to ', topicKey, msg);
  
  if (config.colour) {
    rgb.colour(config.colour);
  }

  listenForCommands(messagingClient, topicKey, config.id, function (msg) {
    var colour = msg.content.colour;
    if (colour) {
      rgb.colour(colour);
    }
  }); 

  // messagingClient.sendToExchange(exchange, topicKey, msg);

  return [config.id, rgb];
}

function listenForCommands(messagingClient, topicKey, id, handler) {
  return messagingClient.createAndBindToExchange({
    exchangeName: 'radiodan',
    topicsKey: topicKey
  }).then(function() {
    logger.info('Registered: ', id, 'on: ', topicKey);

    // messagingClient.on(topicKey, respondToCommand);
    messagingClient.on(topicKey, handler);
  }, failedPromiseHandler(logger));
}

function objectify(array) {
  return array.reduce(function (result, items) {
    if (items && items.length === 2) {
      result[ items[0] ] = items[1];
    }
    return result;
  }, {});
}

function clone(obj) {
  return JSON.parse( JSON.stringify(obj) );
}
