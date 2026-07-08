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

// マイク入力ゲインのスライダーをキャンバス上部に差し込む。
// キャンバス外のネイティブ DOM なので、既存のタッチ判定・座標には影響しない。
function setupMicGainSlider(micGain: Tone.Gain) {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  const wrap = document.createElement("div");
  wrap.id = "mic-gain";

  const label = document.createElement("label");
  label.id = "mic-gain-label";
  label.setAttribute("for", "mic-gain-slider");
  label.textContent = "マイク ゲイン Mic Gain";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = "mic-gain-slider";
  slider.min = "0";
  slider.max = "5";
  slider.step = "0.05";
  slider.value = "1";

  const value = document.createElement("span");
  value.id = "mic-gain-value";
  value.textContent = "×1.00";

  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    // クリックノイズを避けて滑らかに反映
    micGain.gain.rampTo(v, 0.03);
    value.textContent = "×" + v.toFixed(2);
  });

  wrap.appendChild(label);
  wrap.appendChild(slider);
  wrap.appendChild(value);
  // キャンバス(#sketch)の上に差し込む
  app.insertBefore(wrap, app.firstChild);
}

// ゲイン後の実信号レベルを表示するレベルメーター。
// micGain の直後に Tone.Meter を挿すので、ループバックの ON/OFF に関係なく
// 常に「今マイクがどれくらい拾っているか」を横バーで確認できる。
// ピークホールドのマーカーと、0dBFS 到達時に点灯する CLIP 警告付き。
function setupGainMeter(micGain: Tone.Gain) {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  // レベル測定用。normalRange:false で dBFS 値を取得する。
  // smoothing は 1 に近いほど平均時間が長く、表示が滑らか（動きが穏やか）になる。
  const meter = new Tone.Meter({ normalRange: false, smoothing: 0.92 });
  micGain.connect(meter);

  const wrap = document.createElement("div");
  wrap.id = "gain-meter";

  const label = document.createElement("span");
  label.id = "gain-meter-label";
  label.textContent = "レベル Level";

  const track = document.createElement("div");
  track.id = "gain-meter-track";

  // dBFS を 0..1 のバー長へ写像するレンジ（-60dB を下限とする）。
  const MIN_DB = -60;
  const dbToFrac = (db: number) =>
    Math.max(0, Math.min(1, (db - MIN_DB) / (0 - MIN_DB)));

  // 段階式（LED風）セグメントを生成する。
  // 各セグメントには到達しきい値(dB)とゾーン色を持たせ、
  // 未到達でも薄く色を表示して緑→橙→赤のゾーンを常に見せる。
  const SEG_COUNT = 28;
  const segs: Array<{ el: HTMLDivElement; db: number }> = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    // このセグメントが点灯する dB しきい値（左=小さい, 右=0dBFS付近）
    // 配色は案A（デジタルの基準録音レベル -18dBFS を緑の上限とする）:
    //   緑: 〜-18dBFS / 黄: -18〜-6dBFS / 赤: -6〜0dBFS
    const segDb = MIN_DB + ((i + 0.5) / SEG_COUNT) * (0 - MIN_DB);
    let color = "#22c55e"; // 緑（〜-18）
    if (segDb >= -6) color = "#ef4444"; // 赤（-6〜0）
    else if (segDb >= -18) color = "#eab308"; // 黄（-18〜-6）
    const el = document.createElement("div");
    el.className = "gain-meter-seg";
    el.style.setProperty("--seg-color", color);
    track.appendChild(el);
    segs.push({ el, db: segDb });
  }

  const peak = document.createElement("div");
  peak.id = "gain-meter-peak";
  track.appendChild(peak);

  wrap.appendChild(label);
  wrap.appendChild(track);

  // スライダー(#mic-gain)の直下に差し込む
  const micGainEl = document.querySelector("#mic-gain");
  if (micGainEl && micGainEl.nextSibling) {
    app.insertBefore(wrap, micGainEl.nextSibling);
  } else {
    app.insertBefore(wrap, app.firstChild);
  }

  let peakFrac = 0;
  let peakHoldUntil = 0;

  const draw = () => {
    const raw = meter.getValue();
    // ステレオだと配列で返るので大きい方を採用する。
    const db = Array.isArray(raw) ? Math.max(raw[0], raw[1]) : raw;
    const frac = Number.isFinite(db) ? dbToFrac(db) : 0;

    // 現在のレベルに達したセグメントを点灯（.on）、未到達は薄く表示。
    for (let i = 0; i < segs.length; i++) {
      segs[i].el.classList.toggle("on", Number.isFinite(db) && db >= segs[i].db);
    }

    const now = performance.now();

    // ピークホールド：更新時は即追従し、その後 1秒保持してから落ちる。
    if (frac >= peakFrac) {
      peakFrac = frac;
      peakHoldUntil = now + 1000;
    } else if (now > peakHoldUntil) {
      peakFrac = Math.max(frac, peakFrac - 0.006);
    }
    peak.style.left = (peakFrac * 100).toFixed(1) + "%";
    peak.style.display = peakFrac > 0 ? "block" : "none";

    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

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
    // マイク入力ゲイン段。mic のすぐ後ろに挟み、録音・ビジュアライザ・
    // ループバックすべてをこのゲイン後の信号に通す（＝スライダーが全体に効く）。
    const micGain = new Tone.Gain(1);
    mic.connect(micGain);
    recorder = new Tone.Recorder({ mimeType: "audio/mp4" });
    micGain.connect(recorder);
    analyser = new Tone.Analyser("waveform", 512);
    Tone.getDestination().connect(analyser);

    // マイクゲイン調整スライダー（iPad の指操作向けにネイティブ range を使用）
    setupMicGainSlider(micGain);
    // スライダー直下にゲイン後のレベルメーターを表示
    setupGainMeter(micGain);

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
                new AudioBank(p, 25 + i * 100, 25, i, recImg, playImg, downloadImg, loopImg, micGain, analyser)
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
              micGain
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