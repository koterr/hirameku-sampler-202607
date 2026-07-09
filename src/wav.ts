// AudioBuffer を 16bit PCM の WAV (RIFF) にエンコードする。
//
// なぜ必要か:
//   MediaRecorder は WAV を出力できない（iPad Safari は audio/mp4 = AAC のみ）。
//   そのため録音は mp4/AAC のまま → 再生用にデコード済みの AudioBuffer を
//   WAV として書き出す、という経路をとる。DAW（Ableton 等）が確実に読める形式。
//
// 注意: 元が AAC のため音質はロスレスにはならない（デコード結果を無圧縮で
//   WAV 化するだけ）。ブラウザの録音 API 側の制約であり回避できない。
//
// 外部ライブラリ依存なし。

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const numFrames = buffer.length;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  // --- RIFF ヘッダ (44 bytes) ---
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");

  // fmt チャンク
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt チャンクのサイズ
  view.setUint16(20, 1, true); // 1 = リニア PCM（非圧縮）
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // バイト/秒
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true); // ビット深度

  // data チャンク
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // --- サンプル本体（チャンネルをインターリーブして書き込む）---
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      // Float32 (-1.0〜1.0) を Int16 に変換。範囲外はクリップする。
      let sample = channels[c][i];
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
