function Microphone(_fft, smoothing) {

    var FFT_SIZE = _fft || 2048;
    var smoothingAmount = smoothing || 0.9;

    this.spectrum = new Uint8Array(FFT_SIZE/2);
    this.data = [];
    this.volume = this.vol = 0;
    this.peak_volume = 0;
    this.waveform = new Float32Array(FFT_SIZE/2);
        
    var self = this;
    var audioContext = new AudioContext();

    var SAMPLE_RATE = audioContext.sampleRate;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

    window.addEventListener('click', init, false);

    function init () {
        try {
            startMic(new AudioContext());
        }
        catch (e) {
            console.error(e);
            alert('Web Audio API is not supported in this browser');
        }
    }


    function startMic (context) {

        navigator.getUserMedia({ audio: true }, processSound, error);

        function processSound (stream) {
            // analyser extracts frequency, waveform, and other data
            var analyser = context.createAnalyser();
            analyser.smoothingTimeConstant = smoothingAmount;
            analyser.fftSize = FFT_SIZE;
            
            var node = context.createScriptProcessor(FFT_SIZE*2, 1, 1);

            node.onaudioprocess = function () {
                // getByteFrequencyData returns the amplitude for each frequency
                analyser.getByteFrequencyData(self.spectrum);
                self.data = adjustFreqData(self.spectrum);

                // getByteTimeDomainData gets volumes over the sample time
                analyser.getFloatTimeDomainData(self.waveform);
                
                self.vol = self.getRMS(self.spectrum);
                // get peak
                if (self.vol > self.peak_volume) self.peak_volume = self.vol;
                self.volume = self.vol;
            };

            var input = context.createMediaStreamSource(stream);

            input.connect(analyser);
            analyser.connect(node);
            node.connect(context.destination);

        }

        function error () {
            console.log(arguments);
        }
    }

    ///////////////////////////////////////////////
    ////////////// SOUND UTILITIES  ///////////////
    ///////////////////////////////////////////////

    this.getWaveform = function() {
        //returns the time domain
        return self.waveform;
    }


    this.mapWaveform = function(_me, _total, _min, _max){
        if (self.waveform.length > 0) {
            var min = _min || 0;
            var max = _max || 100;
            //actual new freq
            var new_freq = Math.floor(_me/_total * (self.waveform.length)/2);
            //console.log(self.spectrum[new_freq]);
            // map the volumes to a useful number
            return map(self.waveform[new_freq], 0, self.peak_volume, min, max);
        } else {
            return 0;
        }
    }


    this.mapSound = function(_me, _total, _min, _max){
        if (self.spectrum.length > 0) {
            var min = _min || 0;
            var max = _max || 100;
            //actual new freq
            var new_freq = Math.floor(_me /_total * self.data.length);
            //console.log(self.spectrum[new_freq]);
            // map the volumes to a useful number
            return map(self.data[new_freq], 0, self.peak_volume, min, max);
        } else {
            return 0;
        }

    }


    this.mapRawSound = function(_me, _total, _min, _max){
        if (self.spectrum.length > 0) {
            var min = _min || 0;
            var max = _max || 100;
            //actual new freq
            var new_freq = Math.floor(_me/_total * (self.spectrum.length)/2);
            //console.log(self.spectrum[new_freq]);
            // map the volumes to a useful number
            return map(self.spectrum[new_freq], 0, self.peak_volume, min, max);
        } else {
            return 0;
        }
    }


    this.getVol = function(){
        // map total volume to 100 for convenience
        self.volume = map(self.vol, 0, self.peak_volume, 0, 100);
        return self.volume;
    }

    this.getVolume = function() { return this.getVol();}

    //A more accurate way to get overall volume
    //Some arrays were not always filled right up hence the non-zero addition
    this.getRMS = function (spectrum) {
        var rms = 0;
        var non_zero = 0;
        for (var i = 0; i < spectrum.length; i++) {
            if (spectrum[i] != 0) {
                non_zero += 1;
            }
            rms += spectrum[i] * spectrum[i];
        }
        
        if (non_zero != 0) {
            rms /= non_zero;
        } else {
            rms = 0;
        }
        
        rms = Math.sqrt(rms);
        return rms;
    }

    //freq = n * SAMPLE_RATE / MY_FFT_SIZE
    function mapFreq(i){
        var freq = i * SAMPLE_RATE / FFT_SIZE;
        return freq;
    }

    // getMix function. Computes the current frequency with
    // computeFreqFromFFT, then returns bass, mids and his
    this.getMix = function(){
        var highs = [];
        var mids = [];
        var bass = [];
        var snares = [];
        for (var i = 0; i < self.spectrum.length; i++) {
            var band = mapFreq(i);
            var v = map(self.spectrum[i], 0, self.peak_volume, 0, 100);
            if (band <= 200) {
                bass.push(v);
            }
            
            if (band > 200 && band <= 6000) {
                mids.push(v);
            }
            
            if (band > 6000) {
                highs.push(v);
            }
            
            //not using snares yet
            if (1 != 1) {
                snares.push(v)
            }
        }
        return {bass: bass, mids: mids, highs: highs, snares: snares}
    }


    this.getBass = function(){
        return this.getMix().bass;
    }

    this.getMids = function(){
        return this.getMix().mids;
    }

    this.getHighs = function(){
        return this.getMix().highs;
    }

    this.getSnares = function() {
        return this.getMix().snares;
    }

    this.getHighsVol = function(_min, _max){
        var min = _min || 0;
        var max = _max || 100;
        var v = map(this.getRMS(this.getMix().highs), 0, self.peak_volume, min, max);
        return v;
    }

    this.getMidsVol = function(_min, _max){
        var min = _min || 0;
        var max = _max || 100;
        var v = map(this.getRMS(this.getMix().mids), 0, self.peak_volume, min, max);
        return v;
    }

    this.getBassVol = function(_min, _max){
        var min = _min || 0;
        var max = _max || 100;
        var v = map(this.getRMS(this.getMix().bass), 0, self.peak_volume, min, max);
        return v;
    }

    this.getSnaresVol = function(_min, _max) {
        var min = _min || 0;
        var max = _max || 100;
        var v = map(this.getRMS(this.getMix().snares), 0, self.peak_volume, min, max);
        return v;
    }


    function adjustFreqData(frequencyData, ammt) {
        // get frequency data, remove obsolete
        // analyserNode.getByteFrequencyData(frequencyData);

        frequencyData.slice(0,frequencyData.length/2);
        var new_length = ammt || 16;
        var newFreqs = [], prevRangeStart = 0, prevItemCount = 0;

        // looping for my new 16 items
        for (var j=1; j<=new_length; j++) {
            // define sample size
            var pow, itemCount, rangeStart;

            if (j%2 === 1) {
                pow = (j-1)/2;
            } else {
                pow = j/2;
            }

            itemCount = Math.pow(2, pow);

            if (prevItemCount === 1) {
                rangeStart = 0;
            } else {
                rangeStart = prevRangeStart + (prevItemCount/2);
            }

            // get average value, add to new array
            var newValue = 0, total = 0;

            for (var k=rangeStart; k<rangeStart+itemCount; k++) {
                // add up items and divide by total
                total += frequencyData[k];
                newValue = total/itemCount;
            }

            newFreqs.push(newValue);
            // update
            prevItemCount = itemCount;
            prevRangeStart = rangeStart;
        }
        return newFreqs;
    }

    return this;

};



var Mic = new Microphone();
