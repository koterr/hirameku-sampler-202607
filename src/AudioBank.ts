import p5 from "p5";
import * as Tone from "tone";

class AudioBank {
  p: p5;
  x: number;
  y: number;
  fileLabel: p5.Element;
  fileInput: p5.Element;
  loop: boolean;
  recording: boolean;
  recordedURL: string;
  player: Tone.Player;
  id: number;
  recIcon: p5.Element;
  playIcon: p5.Element;
  downloadIcon: p5.Element;
  loopIcon: p5.Element;
  buttonSize: number = 50;
  buttonMargin: number = 10;
  buttonOffsetY: number = 60;
  mic: Tone.UserMedia;
  analyser: Tone.Analyser;

  constructor(
    p: p5,
    x: number,
    y: number,
    id: number,
    recIcon: p5.Element,
    playIcon: p5.Element,
    downloadIcon: p5.Element,
    loopIcon: p5.Element,
    mic: Tone.UserMedia,
    analyser: Tone.Analyser
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.fileLabel = p.createElement("label", "");
    this.fileLabel.position(this.x, this.y);
    this.fileLabel.class("label");
    this.fileLabel.attribute("for", `file-${id}`);
    this.fileInput = p.createFileInput(this.load.bind(this));
    this.fileInput?.position(this.x, this.y);
    this.fileInput?.attribute("id", `file-${id}`);
    this.fileInput?.class("file");
    this.loop = false;
    this.recording = false;
    this.recordedURL = "";
    this.player = new Tone.Player().toDestination();
    this.id = id;
    this.recIcon = recIcon;
    this.playIcon = playIcon;
    this.downloadIcon = downloadIcon;
    this.loopIcon = loopIcon;
    this.mic = mic;
    this.analyser = analyser;

  }

  load(file: p5.File) {
    this.player.load(file.data);
  }

  play() {
    if (this.player.loaded) {
      if (this.player.state === "started") {
        this.player.stop();
      }
      this.player.start();
    }
  }

  async record(recorder: Tone.Recorder) {
    if (this.recording) {
      this.recording = false;
      this.mic.disconnect(this.analyser);
      const recorded = await recorder.stop();
      const url = URL.createObjectURL(recorded);
      this.recordedURL = url;
      await this.player.load(url);
    } else {
      this.recording = true;
      this.mic.connect(this.analyser);
      recorder.start();
    }
  }

  download() {
    if (this.recordedURL === "") return;
    const anchor = document.createElement("a");
    anchor.download = `record-${this.id}-${new Date().toISOString()}`;
    anchor.href = this.recordedURL;
    anchor.click();
  }

  async contains(x: number, y: number, recorder: Tone.Recorder) {
    if (
      x > this.x &&
      x < this.x + this.buttonSize &&
      y > this.y + this.buttonOffsetY &&
      y < this.y + this.buttonOffsetY + this.buttonSize
    ) {
      this.record(recorder);
    } else if (
      x > this.x &&
      x < this.x + this.buttonSize &&
      y > this.y + this.buttonOffsetY + this.buttonSize + this.buttonMargin &&
      y < this.y + this.buttonOffsetY + this.buttonSize * 2 + this.buttonMargin
    ) {
      this.play();
    } else if (
      x > this.x &&
      x < this.x + this.buttonSize &&
      y >
        this.y +
          this.buttonOffsetY +
          this.buttonSize * 2 +
          this.buttonMargin * 2 &&
      y <
        this.y +
          this.buttonOffsetY +
          this.buttonSize * 3 +
          this.buttonMargin * 2
    ) {
      let prevPlayerState = this.player.state;
      this.player.loop = !this.player.loop;
      if (prevPlayerState === "stopped") {
        this.player.stop();
      }
    } else if (
      x > this.x &&
      x < this.x + this.buttonSize &&
      y >
        this.y +
          this.buttonOffsetY +
          this.buttonSize * 3 +
          this.buttonMargin * 3 &&
      y <
        this.y +
          this.buttonOffsetY +
          this.buttonSize * 4 +
          this.buttonMargin * 3
    ) {
      this.download();
    }
  }

  display() {
    this.p.noStroke();
    // Record Button
    this.p.fill(255);
    if (this.recording) {
      this.p.fill(255, 72, 176);
    } else {
      this.p.fill(255);
    }
    this.p.ellipse(
      this.x + 25,
      this.y + 25 + 60,
      this.buttonSize,
      this.buttonSize
    );
    this.p.image(this.recIcon, this.x + 5, this.y + 5 + 60, 40, 40);

    this.p.fill(0);

    // Play Button
    if (this.player.loaded) {
      this.p.fill(255);

      if (this.player.state === "started") {
        this.p.fill(94, 200, 229);
      } else {
        this.p.fill(255);
      }
    } else {
      this.p.fill(112, 116, 124);
    }

    this.p.ellipse(
      this.x + 25,
      this.y + 25 + 120,
      this.buttonSize,
      this.buttonSize
    );
    this.p.image(this.playIcon, this.x + 5, this.y + 5 + 120, 40, 40);

    // Loop Button
    if (this.player.loop) {
      this.p.fill(255, 232, 0);
    } else {
      this.p.fill(255);
    }

    this.p.ellipse(
      this.x + 25,
      this.y + 25 + 180,
      this.buttonSize,
      this.buttonSize
    );
    this.p.image(this.loopIcon, this.x + 5, this.y + 5 + 180, 40, 40);

    // Download Button
    if (this.recordedURL === "") {
      this.p.fill(112, 116, 124);
    } else {
      this.p.fill(255);
    }
    this.p.rect(this.x, this.y + 240, 50, 50, 8, 8, 8, 8);
    this.p.image(this.downloadIcon, this.x + 5, this.y + 5 + 240, 40, 40);
  }
}

export default AudioBank;
