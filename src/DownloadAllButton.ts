import p5 from "p5";
import AudioBank from "./AudioBank";

export default class DownloadAllButton {
  p: p5;
  x: number;
  y: number;
  size: number;
  icon: p5.Element;
  audios: AudioBank[];

  constructor(p: p5, x: number, y: number, size: number, icon: p5.Element, audios: AudioBank[]) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.size = size;
    this.icon = icon;
    this.audios = audios;
  }

  display() {
    this.p.fill(255);
    this.p.noStroke();
    this.p.rect(this.x, this.y, this.size, this.size, 8);
    this.p.image(this.icon, this.x + 5, this.y + 5, this.size - 10, this.size - 10);
  }

  contains(x: number, y: number) {
    if (
      x > this.x &&
      x < this.x + this.size &&
      y > this.y &&
      y < this.y + this.size
    ) {
      this.downloadAll();
      return true;
    }
    return false;
  }

  downloadAll() {
    let downloadCount = 0;
    this.audios.forEach((audio, index) => {
      if (audio.recordedURL !== "") {
        setTimeout(() => {
          audio.download();
        }, index * 200);
        downloadCount++;
      }
    });
    if (downloadCount === 0) {
      alert("録音されたデータがありません。");
    }
  }
}
