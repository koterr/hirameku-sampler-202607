import p5 from "p5";
import * as Tone from "tone";

export default class LoopbackButton {
  p: p5;
  x: number;
  y: number;
  size: number;
  icon: p5.Element;
  mic: Tone.UserMedia;
  enabled: boolean;

  constructor(
    p: p5,
    x: number,
    y: number,
    size: number,
    icon: p5.Element,
    mic: Tone.UserMedia
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.size = size;
    this.icon = icon;
    this.mic = mic;
    this.enabled = false;
  }

  display() {
    this.p.noStroke();
    if (this.enabled) {
      this.p.fill(255, 72, 176); // Pink/Active color
    } else {
      this.p.fill(255); // White/Inactive color
    }
    this.p.rect(this.x, this.y, this.size, this.size, 8);
    this.p.image(
      this.icon,
      this.x + 5,
      this.y + 5,
      this.size - 10,
      this.size - 10
    );
  }

  contains(x: number, y: number) {
    if (
      x > this.x &&
      x < this.x + this.size &&
      y > this.y &&
      y < this.y + this.size
    ) {
      this.toggle();
      return true;
    }
    return false;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.mic.connect(Tone.getDestination());
    } else {
      this.mic.disconnect(Tone.getDestination());
    }
  }
}
