/**
 * Video compression using ffmpeg.wasm (runs entirely in the browser via WebAssembly).
 * Requires Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp
 * headers (configured in vite.config.js and vercel.json).
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance = null
let loadPromise = null

const FFMPEG_CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CDN}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  return loadPromise
}

/**
 * Returns true if the browser supports SharedArrayBuffer (required for ffmpeg.wasm).
 */
export function isVideoCompressionSupported() {
  return typeof SharedArrayBuffer !== 'undefined'
}

/**
 * Compresses a video file to H.264 MP4, max 720p.
 * @param {File} file - The input video file
 * @param {(progress: number) => void} onProgress - Called with 0-100 progress
 * @returns {Promise<Blob>} Compressed video as a Blob (video/mp4)
 */
export async function compressVideo(file, onProgress = () => {}) {
  const ffmpeg = await getFFmpeg()
  const ext = file.name.split('.').pop() || 'mp4'
  const inputName = `input.${ext}`
  const outputName = 'output.mp4'

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(99, Math.round(progress * 100)))
  })

  await ffmpeg.writeFile(inputName, await fetchFile(file))
  await ffmpeg.exec([
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', '28',
    '-preset', 'fast',
    '-vf', 'scale=-2:720',
    '-movflags', '+faststart',
    '-acodec', 'aac',
    '-b:a', '128k',
    outputName
  ])

  const data = await ffmpeg.readFile(outputName)

  // Clean up
  try { await ffmpeg.deleteFile(inputName) } catch {}
  try { await ffmpeg.deleteFile(outputName) } catch {}

  onProgress(100)
  return new Blob([data.buffer], { type: 'video/mp4' })
}
