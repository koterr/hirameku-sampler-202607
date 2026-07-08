// src/main.ts
import "./style.css";
import p5 from "p5";
import * as Tone from "tone";
import AudioBank from "./AudioBank.ts";
import DownloadAllButton from "./DownloadAllButton.ts";
import LoopbackButton from "./LoopbackButton.ts";

// Insert the sketch container into the page
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div id="sketch"></div>
`;

// UI: start button (present in HTML)
const startButton = document.querySelector<HTMLButtonElement>("button");
const WINDOW_WIDTH = 600;
const WINDOW_HEIGHT = 745;

if (!startButton) {
  console.error("Start button not found – aborting.");
} else {
  startButton.addEventListener("click", async () => {
    // Remove the start button
    startButton.remove();

    // Initialise Tone.js (required for microphone access)
    await Tone.start();
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }

    const sketch = document.querySelector<HTMLDivElement>("#sketch")!;
    let audios: Array<AudioBank> = [];
    let downloadAllButton: DownloadAllButton;
    let loopbackButton: LoopbackButton;
    let mic: Tone.UserMedia;
    let recorder: Tone.Recorder;
    let analyser: Tone.Analyser;
    const visualiserY = 345;
    const visualiserH = 400;

    // Download All button properties
    const downloadAllBtnX = WINDOW_WIDTH - 64;
    const downloadAllBtnY = WINDOW_HEIGHT - 64;
    const downloadAllBtnSize = 48;

    // Audio input / recorder (iOS needs mp4 MIME type)
    // Initialize this early so we can pass the recorder to AudioBank instances if needed
    mic = new Tone.UserMedia();
    // @ts-ignore
    mic.open({
      channelCount: 2,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    recorder = new Tone.Recorder({ mimeType: "audio/mp4" });
    mic.connect(recorder);
    analyser = new Tone.Analyser("waveform", 512);
    Tone.getDestination().connect(analyser);

    // p5 sketch definition
    new p5((p: p5) => {
      // ---------- setup ----------
      p.setup = () => {
        const base = import.meta.env.BASE_URL;

        // Load SVG icons as hidden p5 elements
        const recImg = p.createImg(base + "rec.svg", "rec");
        const playImg = p.createImg(base + "play.svg", "play");
        const downloadImg = p.createImg(base + "download.svg", "download");
        const loopImg = p.createImg(base + "loop.svg", "loop");
        const downloadAllImg = p.createImg(base + "download_all.svg", "download_all");
        const loopbackImg = p.createImg(base + "loopback.svg", "loopback");
        
        recImg.hide();
        playImg.hide();
        downloadImg.hide();
        loopImg.hide();
        downloadAllImg.hide();
        loopbackImg.hide();

        // Wait until all icons are loaded before creating AudioBank instances
        let loaded = 0;
        const totalImages = 6;
        const onLoaded = () => {
          loaded++;
          if (loaded === totalImages) {
            for (let i = 0; i < 6; i++) {
              audios.push(
                new AudioBank(p, 25 + i * 100, 25, i, recImg, playImg, downloadImg, loopImg, mic, analyser)
              );
            }
            downloadAllButton = new DownloadAllButton(
              p,
              downloadAllBtnX,
              downloadAllBtnY,
              downloadAllBtnSize,
              downloadAllImg,
              audios
            );
            loopbackButton = new LoopbackButton(
              p,
              downloadAllBtnX - 60,
              downloadAllBtnY,
              downloadAllBtnSize,
              loopbackImg,
              mic
            );
          }
        };
        
        const onError = (e: Event | string) => {
            console.error("Failed to load image", e);
            // Still count as loaded to avoid blocking the app, but maybe with a placeholder or broken state
            onLoaded();
        };

        recImg.elt.onload = onLoaded;
        playImg.elt.onload = onLoaded;
        downloadImg.elt.onload = onLoaded;
        loopImg.elt.onload = onLoaded;
        downloadAllImg.elt.onload = onLoaded;
        loopbackImg.elt.onload = onLoaded;

        recImg.elt.onerror = onError;
        playImg.elt.onerror = onError;
        downloadImg.elt.onerror = onError;
        loopImg.elt.onerror = onError;
        downloadAllImg.elt.onerror = onError;
        loopbackImg.elt.onerror = onError;

        // Canvas
        p.createCanvas(WINDOW_WIDTH, WINDOW_HEIGHT);
      };

      // ---------- draw ----------
      p.draw = () => {
        p.background(165, 170, 168);
        p.stroke(230);
        for (let i = 0; i < 5; i++) {
          p.line(100 + i * 100, 25, 100 + i * 100, 315);
        }

        if (!analyser) return;
        audios.forEach((a) => a.display());

        const values = analyser.getValue();
        p.noStroke();
        p.fill(0);
        p.rect(0, visualiserY, WINDOW_WIDTH, visualiserH);
        p.noFill();
        p.stroke(0, 255, 0);
        p.beginShape();
        for (let i = 0; i < values.length; i++) {
          const amp = values[i] as number;
          const x = p.map(i, 0, values.length - 1, 0, WINDOW_WIDTH);
          const y =
            visualiserY +
            visualiserH / 2 +
            p.constrain(amp * visualiserH, -visualiserH / 2, visualiserH / 2);
          p.vertex(x, y);
        }
        p.endShape();

        if (downloadAllButton) {
          downloadAllButton.display();
        }
        if (loopbackButton) {
          loopbackButton.display();
        }
      };

      // ---------- input (touch & mouse) ----------
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p as any).touchStarted = () => {
        audios.forEach((a) => a.contains(p.mouseX, p.mouseY, recorder));
        if (downloadAllButton) {
          downloadAllButton.contains(p.mouseX, p.mouseY);
        }
        if (loopbackButton) {
          loopbackButton.contains(p.mouseX, p.mouseY);
        }
      };
      p.mousePressed = () => {
        audios.forEach((a) => a.contains(p.mouseX, p.mouseY, recorder));
        if (downloadAllButton) {
          downloadAllButton.contains(p.mouseX, p.mouseY);
        }
        if (loopbackButton) {
          loopbackButton.contains(p.mouseX, p.mouseY);
        }
      };
    }, sketch);
  });
}
