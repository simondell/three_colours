var AudioContext = window.AudioContext || window.webkitAudioContext;
var ac = new AudioContext();

////////////////////////////////////////////////////////////////////////
//   DRUMS
////////////////////////////////////////////////////////////////////////

//
// sounds
function loadSample(url, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
          ac.decodeAudioData(request.response, callback);
    };
    request.send();
}

function playSound (buffer, when) {
    var player = ac.createBufferSource();
    player.buffer = buffer;
    player.start(when);
    player.connect(ac.destination);
}

var drums = [
  { label: 'name', file: '003_12.wav', buffer: null },
  { label: 'name', file: '001_5.wav', buffer: null },
  { label: 'name', file: '007_SN.wav', buffer: null },
  { label: 'name', file: '000_DR55 hi hat.wav', buffer: null },
  { label: 'name', file: '000_blipp01.wav', buffer: null },
  { label: 'name', file: '001_blipp02.wav', buffer: null },
  { label: 'name', file: '003_VoodooSnare.wav', buffer: null },
  { label: 'name', file: '004_VoodooTom.wav', buffer: null },
  { label: 'name', file: '005_Sound15.wav', buffer: null },
  { label: 'name', file: '006_Sound17.wav', buffer: null },
  { label: 'name', file: '006_7.wav', buffer: null },
  { label: 'name', file: '3.wav', buffer: null },
  { label: 'name', file: 'BT7A0D0.wav', buffer: null },
  { label: 'name', file: 'Colors-Words.wav', buffer: null },
  { label: 'name', file: 'boip.wav', buffer: null },
  { label: 'name', file: 'simpletone.wav', buffer: null }
];

drums.forEach(function (drum) {
  loadSample(drum.file, function (buffer) {
    drum.buffer = buffer;
    // playSound(buffer, ac.currentTime);
  });
});


//
// sequencer
var step = 0;
var interval = 0.125;
var wait_time = 0.5;
var got_up_to;
var timer = null;
var hits = null;

function tick () {
    var now = ac.currentTime;
    var max_future_time = now + wait_time * 1.5;
    var col = step % beats.col;

    if(interval <= 0) interval = 1;
    if(got_up_to > now) now = got_up_to;

    while(now < max_future_time) {
        for(
          var row = 0;
          row < beats.row;
          row++
        ) {
          if(beats.matrix[col][row]) {
            playSound(drums[row].buffer, now);
          }
        }
        now += interval;
        step += 1;
    }
    got_up_to = now;
    beats.life();
}


//
// controls
var beats;
var bpm;
var startstop;

function handleStartStop (data) {
  if(data.value) {
    timer = setInterval(tick, interval * 1000);
  } else {
    step = 0;
    clearInterval(timer);
  }
}

function handleChangeBPM(data) {
  var bpm = data.value;
  interval = 60 / (bpm * 4);
}

////////////////////////////////////////////////////////////////////////
//   SYNTH
////////////////////////////////////////////////////////////////////////


var wail;
var freq;
var osc1;
var osc1_amp = ac.createGain();

// main
osc1_amp.gain.value = 0.2;

// lfo
var osc2 = ac.createOscillator();
var osc2_amp = ac.createGain();
osc2.frequency.value = 100;
osc2.type = 'triangle';
osc2.connect(osc2_amp);
osc2_amp.gain.value = 300;
osc2.start();

// delay
var del = ac.createDelay();
var fb = ac.createGain();
var splitter = ac.createChannelSplitter(2);
splitter.connect(ac.destination);
splitter.connect(del);
fb.gain.value = 0.5;
del.connect(fb);
fb.connect(del);
del.connect(ac.destination);
osc1_amp.connect(splitter);


function handleWail (data) {
  var x = nx.clip(data.x, 0, 100);
  var y = nx.clip(data.y, 0, 100);

  // on
  if(data.press && data.press === 1) {
    freq = x * 10 + 22.5;
    osc1 = ac.createOscillator();
    osc2_amp.connect(osc1.frequency);
    osc1.type = 'triangle';
    osc1.connect(osc1_amp);
    osc1.start();
  }

  // off
  if(data.press !== undefined && data.press === 0) {
    osc1.stop();
    osc1 = null;
  }

  // aftertouch
  if(data.press === undefined ) {
    if( freq > 2000 ) {
      freq = x * 10 + 22.5;
    } else {
      freq *= nx.scale(x, 0, 100, 1, 2.3);
    }

    fb.gain.value = nx.scale(x,0,100,0.9,0.6);
    del.delayTime.value = nx.scale(y, 0, 100, interval * 2, interval * 6)
  }

  if(osc1) {
    osc1.frequency.setValueAtTime(freq, ac.currentTime);
  }
}


//
// master
nx.onload = function () {
  beats.row = 16;
  beats.col = 16;
  beats.init();

  startstop.on('*', handleStartStop);

  bpm.set({value: 120});
  bpm.on('*', handleChangeBPM);

  wail.on('*', handleWail);
};
