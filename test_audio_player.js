// --- Minimal Fake DOM and Browser Environment ---
const fakeDOMElements = {};
let fakeAudioTimeInterval = null;

global.window = {
    setInterval: (fn, ms) => {
        // For testing, we want to control time progression more directly.
        // The actual interval in Director will use this, but we'll advance time manually.
        // Store the function to call it. For simplicity, only one interval at a time.
        global.window.intervalFunction = fn;
        // Return a dummy ID
        const intervalId = Date.now();
        global.window.lastIntervalId = intervalId;
        return intervalId;
    },
    clearInterval: (id) => {
        if (id === global.window.lastIntervalId) {
            global.window.intervalFunction = null;
            global.window.lastIntervalId = null;
        }
    },
    intervalFunction: null,
    lastIntervalId: null,
    data: null // Will be populated by belair.json content
};

global.document = {
    getElementById: function(id) {
        if (!fakeDOMElements[id]) {
            fakeDOMElements[id] = {
                id: id,
                textContent: '',
                innerHTML: '',
                style: {},
                _eventListeners: {},
                addEventListener: function(type, listener) {
                    if (!this._eventListeners[type]) {
                        this._eventListeners[type] = [];
                    }
                    this._eventListeners[type].push(listener);
                },
                click: function() { // Helper to simulate click
                    if (this._eventListeners['click']) {
                        this._eventListeners['click'].forEach(fn => fn());
                    }
                }
            };
        }
        return fakeDOMElements[id];
    },
    getElementsByTagName: function(tagName) {
        if (tagName.toLowerCase() === 'audio') {
            if (!fakeDOMElements['#audio']) {
                fakeDOMElements['#audio'] = {
                    _eventListeners: {},
                    paused: true,
                    currentTime: 0,
                    duration: 65, // From belair.json last line
                    muted: true,
                    src: '',
                    play: function() {
                        this.paused = false;
                        console.log("LOG: audioElement.play() called");
                        // Simulate time progression for intervals if any are active
                        // This is a simplified simulation
                        if(global.window.intervalFunction && !fakeAudioTimeInterval) {
                           // The real interval is set by Director, we just advance time here
                        }
                    },
                    pause: function() {
                        this.paused = true;
                        console.log("LOG: audioElement.pause() called");
                        if (fakeAudioTimeInterval) {
                            clearInterval(fakeAudioTimeInterval);
                            fakeAudioTimeInterval = null;
                        }
                    },
                    load: function() { console.log("LOG: audioElement.load() called"); },
                    addEventListener: function(type, listener) {
                         if (!this._eventListeners[type]) {
                            this._eventListeners[type] = [];
                        }
                        this._eventListeners[type].push(listener);
                    },
                    _triggerEvent: function(type) {
                        if (this._eventListeners[type]) {
                            this._eventListeners[type].forEach(fn => fn());
                        }
                    }
                };
            }
            return [fakeDOMElements['#audio']];
        }
        return [];
    }
};

// --- Load belair.json data ---
// Content from resources/belair.json, assigned to window.data
window.data = {
    song: "The Fresh Prince of Bel-Air",
    lines: [
        { time: 0.1, text: "Now this is a story all about how my life got flip turned upside down" },
        { time: 6.6, text: "And i'd like to take a minute, just sit right there" },
        { time: 8.7, text: "I'll tell you how I became the prince of a town called Bel-Air" },
        { time: 10, text: "" }, { time: 21.2, text: "In west Philadelphia, born and raised" },
        { time: 23.2, text: "on the playground is where I spent most of my days" },
        { time: 25.6, text: "chilling out, maxing, relaxing and cooling" },
        { time: 28.5, text: "or shooting some b-ball, outside of school" },
        { time: 30.6, text: "when a couple of guys who were up to no good" },
        { time: 32.6, text: "started making trouble in my neighbourhood" },
        { time: 35.0, text: "i got in one little fight, and my mom got scared" },
        { time: 37, text: "you're going to live with your auntie and uncle in BEL AIR" },
        { time: 40, text: "I whistled for a cab and when it came near" },
        { time: 42.1, text: "the license plate said fresh and it had dice in the mirror" },
        { time: 44.8, text: "if anything i could say that this cab was rare" },
        { time: 47, text: "but i thought man forget it, yo home to BEL AIR" },
        { time: 49, text: "" }, { time: 51, text: "I pulled up to the house about 7 or 8" },
        { time: 54, text: "and i yelled to the cabbie, yo holmes smell you later" },
        { time: 56, text: "i looked at my kingdom, i was finally there" },
        { time: 58.9, text: "to sit on my throne as the PRINCE OF BEL AIR" },
        { time: 65, text: "" }
    ]
};

// --- JavaScript from index.html ---
            var Director = function(data){
                this.data = data;
                this.registerElements();

                this.controls = new Controls(this.audioElement, this);
                this.currentLine = false;
            }

            Director.prototype.reset = function(){
                this.audioElement.currentTime = 0;
                if (this.intervalId) {
                    window.clearInterval(this.intervalId);
                    this.intervalId = null;
                }
                this.currentLine = false;
                this.loudspeaker.innerHTML = "";
                this.lines = JSON.parse(JSON.stringify(window.data.lines));
                this.nextLine = this.lines.shift();
                this.audioElement.muted = true;
            };

            Director.prototype.togglePlayPause = function(){
                var self = this;
                if (this.audioElement.paused) {
                    if (this.currentLine === false) {
                        this.action();
                    } else {
                        this.audioElement.play();
                        if (!this.intervalId) {
                            this.intervalId = window.setInterval(function(){
                                var playTime = self.audioElement.currentTime.toFixed(1);
                                // console.log(playTime); // Reduce noise for test output
                                if(self.nextLine === undefined && !self.currentLine){
                                    window.clearInterval(self.intervalId);
                                    self.intervalId = null;
                                    return;
                                }
                                if(self.currentLine){
                                    self.loudspeaker.innerHTML = self.currentLine.text;
                                }
                                if(self.nextLine && self.nextLine.time < playTime){
                                    self.currentLine = self.nextLine;
                                    self.nextLine = self.lines.shift();
                                } else if (!self.nextLine && self.audioElement.currentTime >= self.audioElement.duration) {
                                     self.currentLine = null;
                                }
                            }, 250);
                        }
                    }
                    return "playing";
                } else {
                    this.audioElement.pause();
                    if (this.intervalId) {
                        window.clearInterval(this.intervalId);
                        this.intervalId = null;
                    }
                    return "paused";
                }
            };

            Director.prototype.registerElements = function(){
                this.audioElement = document.getElementsByTagName("audio")[0];
                this.loudspeaker = document.getElementById("loudspeaker");
            }

            Director.prototype.action = function(){
                var self = this;
                if (this.currentLine === false) {
                    this.audioElement.muted = false;
                    if (!this.lines || this.lines.length === 0) {
                        this.lines = JSON.parse(JSON.stringify(window.data.lines));
                        this.nextLine = this.lines.shift();
                    }
                    this.audioElement.play();
                    if (this.intervalId) {
                        window.clearInterval(this.intervalId);
                    }
                    this.intervalId = window.setInterval(
                        function(){
                            var playTime = self.audioElement.currentTime.toFixed(1);
                            // console.log(playTime); // Reduce noise for test output
                            if(self.nextLine === undefined && !self.currentLine){
                                window.clearInterval(self.intervalId);
                                self.intervalId = null;
                                return;
                            }
                            if(self.currentLine){
                                self.loudspeaker.innerHTML = self.currentLine.text;
                            }
                            if(self.nextLine && self.nextLine.time < playTime){
                                self.currentLine = self.nextLine;
                                self.nextLine = self.lines.shift();
                            } else if (!self.nextLine && self.audioElement.currentTime >= self.audioElement.duration) {
                                self.currentLine = null;
                            }
                        },
                        250
                    );
                } else {
                    this.audioElement.play();
                }
            }

            var Controls = function(audioElement, director){
                this.audioElement = audioElement;
                this.director = director;
                this.registerControls();
                this.init();
            }

            Controls.prototype.registerControls = function(){
                this.stopButton = document.getElementById("stop");
                this.playButton = document.getElementById("play");
            }

            Controls.prototype.init = function(){
                var self = this;
                this.playButton.addEventListener('click',function(){
                    const state = self.director.togglePlayPause();
                    if (state === "playing") {
                        self.playButton.textContent = 'Pause';
                    } else {
                        self.playButton.textContent = 'Start';
                    }
                });
                this.stopButton.addEventListener('click',function(){
                    self.director.reset();
                    self.playButton.textContent = 'Start';
                });
                this.audioElement.addEventListener('ended', function() {
                    self.playButton.textContent = 'Start';
                    self.director.reset();
                });
            }

// --- Test Initialization ---
// Manually initialize the DOM elements that the script expects to exist at load time
const playButton = global.document.getElementById('play');
playButton.textContent = 'Start'; // Initial state from HTML
const stopButton = global.document.getElementById('stop');
stopButton.textContent = 'stop'; // Initial state from HTML
const loudspeaker = global.document.getElementById('loudspeaker');
const audioElement = global.document.getElementsByTagName('audio')[0];

var director = new Director(window.data);

// --- Test Simulation ---
console.log("--- Test Suite Start ---");

// Helper to simulate time passing for the interval
function simulateTimePasses(ms) {
    if (global.window.intervalFunction && !audioElement.paused) {
        // Approximate number of interval calls
        const calls = Math.floor(ms / 250);
        for (let i = 0; i < calls; i++) {
            audioElement.currentTime += 0.250; // Simulate time increment
             if (audioElement.currentTime > audioElement.duration) {
                audioElement.currentTime = audioElement.duration;
            }
            if (global.window.intervalFunction) global.window.intervalFunction();
            if (audioElement.currentTime >= audioElement.duration) {
                audioElement.paused = true; // Auto-pause at end
                audioElement._triggerEvent('ended');
                break;
            }
        }
    } else if (audioElement.paused && audioElement.currentTime >= audioElement.duration) {
        // If it was paused due to reaching the end
        audioElement._triggerEvent('ended');
    }
}


// 1. Initial State Check
console.log("1. Initial State Check:");
console.log(`  Play button text: ${playButton.textContent === 'Start' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
console.log(`  Loudspeaker empty: ${loudspeaker.innerHTML === '' ? 'PASS' : 'FAIL'} (Actual: ${loudspeaker.innerHTML})`);
console.log(`  Audio muted: ${audioElement.muted === true ? 'PASS' : 'FAIL'} (Actual: ${audioElement.muted})`);
console.log(`  Audio currentTime: ${audioElement.currentTime === 0 ? 'PASS' : 'FAIL'} (Actual: ${audioElement.currentTime})`);


// 2. Simulate First Click on Play Button
console.log("\n2. Simulate First Click on Play Button (to Play):");
playButton.click(); // Simulate click
console.log(`  Play button text: ${playButton.textContent === 'Pause' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
console.log(`  Audio muted: ${audioElement.muted === false ? 'PASS' : 'FAIL'} (Actual: ${audioElement.muted})`);
console.log(`  Audio paused: ${audioElement.paused === false ? 'PASS' : 'FAIL'} (Actual: ${audioElement.paused})`);

simulateTimePasses(1000); // Simulate 1 second
console.log(`  Loudspeaker after 1s: ${loudspeaker.innerHTML !== '' ? 'PASS' : 'FAIL'} (Actual: "${loudspeaker.innerHTML}")`);
const firstLine = window.data.lines[0].text;
console.log(`  Loudspeaker content check: ${loudspeaker.innerHTML === firstLine ? 'PASS' : 'FAIL'} (Expected: "${firstLine}", Actual: "${loudspeaker.innerHTML}")`);


// 3. Simulate Second Click on Play Button (to Pause)
console.log("\n3. Simulate Second Click on Play Button (to Pause):");
playButton.click(); // Simulate click
console.log(`  Play button text: ${playButton.textContent === 'Start' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
console.log(`  Audio paused: ${audioElement.paused === true ? 'PASS' : 'FAIL'} (Actual: ${audioElement.paused})`);
const loudspeakerContentBeforePause = loudspeaker.innerHTML;
simulateTimePasses(1000); // Simulate 1 more second (audio is paused)
console.log(`  Loudspeaker content unchanged after pause: ${loudspeaker.innerHTML === loudspeakerContentBeforePause ? 'PASS' : 'FAIL'} (Before: "${loudspeakerContentBeforePause}", After: "${loudspeaker.innerHTML}")`);

// 4. Simulate Click on Stop Button
console.log("\n4. Simulate Click on Stop Button:");
stopButton.click(); // Simulate click
console.log(`  Play button text: ${playButton.textContent === 'Start' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
console.log(`  Loudspeaker empty: ${loudspeaker.innerHTML === '' ? 'PASS' : 'FAIL'} (Actual: "${loudspeaker.innerHTML}")`);
console.log(`  Audio currentTime: ${audioElement.currentTime === 0 ? 'PASS' : 'FAIL'} (Actual: ${audioElement.currentTime})`);
console.log(`  Audio muted: ${audioElement.muted === true ? 'PASS' : 'FAIL'} (Actual: ${audioElement.muted})`);
console.log(`  Audio paused (after stop): ${audioElement.paused === true ? 'PASS' : 'FAIL'} (Actual: ${audioElement.paused})`); // Reset should leave it effectively paused

// 5. Simulate Play to End
console.log("\n5. Simulate Play to End:");
playButton.click(); // Play
console.log(`  Play button text (playing again): ${playButton.textContent === 'Pause' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
// Simulate enough time for the song to end. Duration is 65s.
// Intervals are 250ms. 65 / 0.25 = 260 calls.
// Let's simulate 70 seconds to be sure it triggers 'ended'.
simulateTimePasses(70000);
// After simulateTimePasses, if the audio reached its end, the 'ended' event would have fired,
// calling director.reset(), which sets currentTime to 0.
// So, the primary check is that the state reflects the reset.
console.log(`  Play button text (after ended): ${playButton.textContent === 'Start' ? 'PASS' : 'FAIL'} (Actual: ${playButton.textContent})`);
console.log(`  Loudspeaker empty (after ended): ${loudspeaker.innerHTML === '' ? 'PASS' : 'FAIL'} (Actual: "${loudspeaker.innerHTML}")`);
console.log(`  Audio muted (after ended): ${audioElement.muted === true ? 'PASS' : 'FAIL'} (Actual: ${audioElement.muted})`);
console.log(`  Audio currentTime (after ended): ${audioElement.currentTime === 0 ? 'PASS' : 'FAIL'} (Actual: ${audioElement.currentTime})`);


console.log("\n--- Test Suite End ---");
