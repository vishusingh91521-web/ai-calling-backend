const { exec } = require("child_process");
const path = require("path");

exports.generateVoice = (text) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "../output.mp3");

    const command = `edge-tts --voice hi-IN-SwaraNeural --text "${text}" --write-media "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Edge TTS Error:", stderr);
        reject("Voice generation failed");
      } else {
        resolve(filePath);
      }
    });
  });
};