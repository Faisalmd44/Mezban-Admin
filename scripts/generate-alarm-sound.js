const fs = require("fs");
const path = require("path");

const ALARM_FILE = path.join(__dirname, "..", "assets", "alarm.wav");

if (!fs.existsSync(path.dirname(ALARM_FILE))) {
  fs.mkdirSync(path.dirname(ALARM_FILE), { recursive: true });
}

if (!fs.existsSync(ALARM_FILE)) {
  const sampleRate = 44100;
  const duration = 2;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 800 + Math.sin(t * 2 * Math.PI * 5) * 200;
    const sample = Math.sin(t * 2 * Math.PI * freq) * 0.5 * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  fs.writeFileSync(ALARM_FILE, buffer);
  console.log("Generated alarm.wav");
} else {
  console.log("alarm.wav already exists");
}
