type AudioFrameHandler = (frame: ArrayBuffer) => void

interface MicrophoneController {
  start: (onFrame: AudioFrameHandler) => Promise<void>
  stop: () => void
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number) {
  if (outputRate === inputRate) {
    return buffer
  }
  const ratio = inputRate / outputRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i]
      count += 1
    }

    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult += 1
    offsetBuffer = nextOffsetBuffer
  }

  return result
}

function floatTo16BitPcm(input: Float32Array) {
  const output = new ArrayBuffer(input.length * 2)
  const view = new DataView(output)

  for (let i = 0; i < input.length; i += 1) {
    const value = Math.max(-1, Math.min(1, input[i]))
    view.setInt16(i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true)
  }

  return output
}

export function useMicrophoneStream(targetSampleRate = 16000): MicrophoneController {
  let audioContext: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let processor: ScriptProcessorNode | null = null
  let stream: MediaStream | null = null

  async function start(onFrame: AudioFrameHandler) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = '当前浏览器不支持麦克风访问。请使用 Chrome/Edge/Firefox 最新版'
      throw new Error(msg)
    }
    if (!window.isSecureContext) {
      const msg = '麦克风需要安全上下文。请通过 HTTPS 或 localhost 访问此页面'
      throw new Error(msg)
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    audioContext = new AudioContext()
    source = audioContext.createMediaStreamSource(stream)
    processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
      if (!audioContext) return
      const input = event.inputBuffer.getChannelData(0)
      const downsampled = downsampleBuffer(input, audioContext.sampleRate, targetSampleRate)
      onFrame(floatTo16BitPcm(downsampled))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  function stop() {
    processor?.disconnect()
    source?.disconnect()
    stream?.getTracks().forEach((track) => track.stop())
    void audioContext?.close()
    processor = null
    source = null
    stream = null
    audioContext = null
  }

  return { start, stop }
}
