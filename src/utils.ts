import axios from 'axios'
import cliProgress from 'cli-progress'
import { createHash } from 'crypto'
import dotenv from 'dotenv'
import { filesize } from 'filesize'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { defaultPaks } from './data/default-paks.js'

dotenv.config()

const ronPath = process.env.RON_PATH
const syncMaps = process.env.SYNC_MAPS?.toLowerCase() === 'true'

const pakPath = `${ronPath}/ReadyOrNot/Content/Paks`

export const downloadPak = async (pak: ManifestPak) => {
  const bar = new cliProgress.SingleBar(
    {
      format:
        '{bar} | {filename} | {percentage}% | ETA: {eta_formatted} | {remaining} / {original} | {speed}',
      hideCursor: true
    },
    cliProgress.Presets.rect
  )

  bar.start(0, 0, { filename: pak.filename })

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
        remaining: filesize(total - loaded),
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

export const getHashes = () => {
  console.log('Hashing local pak files...')
  const pakFiles = readdirSync(pakPath)
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
    .map(pak => {
      const hashFn = createHash('sha256')
      hashFn.setEncoding('hex')
      hashFn.write(readFileSync(`${pakPath}/${pak}`))
      hashFn.end()

      const hash = hashFn.read() as string

      if (!hash) {
        console.error(`Failed to hash ${pak}`)
        process.exit(1)
      }

      return {
        filename: pak,
        hash
      }
    })

  return pakFiles
}
