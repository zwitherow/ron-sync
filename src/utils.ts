import axios from 'axios'
import cliProgress from 'cli-progress'
import { createHash } from 'crypto'
import dotenv from 'dotenv'
import { filesize } from 'filesize'
import { createReadStream, readdirSync, writeFileSync } from 'fs'
import { defaultPaks } from './data/default-paks.js'

dotenv.config()

const ronPath = process.env.RON_PATH

const pakPath = `${ronPath}/ReadyOrNot/Content/Paks`

export const downloadPak = async (pak: ManifestPak) => {
  const bar = new cliProgress.SingleBar(
    {
      format:
        '{bar} | {filename} | {percentage}% | {completed} / {original} | {speed} | ETA: {eta_formatted}',
      hideCursor: true,
      clearOnComplete: true
    },
    cliProgress.Presets.rect
  )

  bar.start(1, 0, {
    filename: pak.filename,
    completed: '--',
    original: '--',
    speed: '0 B'
  })

  const client = axios.create({
    timeout: 10000,
    responseType: 'arraybuffer'
  })

  let res = await client.get(pak.url, {
    onDownloadProgress(progressEvent) {
      const total = progressEvent.total || 0
      const loaded = progressEvent.loaded
      const speed = progressEvent.rate || 0

      bar.setTotal(total)
      bar.update(loaded, {
        completed: filesize(loaded),
        original: filesize(total),
        speed: filesize(speed) + '/s'
      })
    }
  })

  bar.update(res.headers['content-length'] || 0)
  bar.stop()

  const arrayBuffer = res.data as ArrayBuffer
  writeFileSync(`${pakPath}/${pak.filename}`, Buffer.from(arrayBuffer))
}

export const getHashes = async () => {
  const bar = new cliProgress.SingleBar(
    {
      format: '{bar} | {percentage}% | {value} / {total}',
      hideCursor: true,
      clearOnComplete: true
    },
    cliProgress.Presets.rect
  )

  const pakList = readdirSync(pakPath).filter(fn => !defaultPaks.includes(fn))

  bar.start(pakList.length, 0, { filename: pakList[0] })

  const pakFiles = await Promise.all(
    pakList
      .filter(file => {
        if (!file.toLowerCase().endsWith('.pak')) {
          return null
        }
        if (defaultPaks.includes(file)) {
          return null
        }
        return file
      })
      .filter(Boolean)
      .map(async pak => {
        const hash = await gen_hash(`${pakPath}/${pak}`)

        if (!hash) {
          showError(`Failed to hash ${pak}`)
        }

        bar.increment(1)

        return {
          filename: pak,
          hash
        }
      })
  )

  bar.update(pakList.length)
  bar.stop()

  return pakFiles
}

function gen_hash(fn: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const fh = createReadStream(fn)

    fh.on('data', d => hash.update(d))
    fh.on('end', () => {
      const digest = hash.digest('hex')
      resolve(digest)
    })
    fh.on('error', reject)
  })
}

export const showError = (msg: string) => {
  console.clear()
  console.log(`${msg}\n\nPress any key to exit...`)

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', process.exit.bind(process, 1))
}
