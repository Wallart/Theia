class DBMeterWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  convertToInt16(audio) {
    for (let i = 0; i < audio.length; i++) {
      audio[i] = audio[i] * 32768.0;
    }
    return new Int16Array(audio);
  }

  computeRMS(array) {
    let rms = 0;
    for (let i=0; i < array.length; i += 1) {
      rms += array[i] * array[i];
    }
    rms /= array.length;
    rms = Math.sqrt(rms);
    return rms;
  }

  computeDBs(rms) {
    let dbs = 0;
    if (rms > 0) {
      dbs = 20 * Math.log10(rms);
    }
    return dbs;
  }

  process(inputs, outputs, parameters) {
    // console.log(inputs);
    // console.log(outputs);
    // console.log(parameters);
    let leftChannel = inputs[0][0];
    let rms = this.computeRMS(this.convertToInt16(leftChannel));
    let dbs = this.computeDBs(rms);
    this.port.postMessage(dbs);
    return true;
  }
}

registerProcessor('db-meter-processor', DBMeterWorkletProcessor);
