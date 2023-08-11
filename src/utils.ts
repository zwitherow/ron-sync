import { createHash } from 'crypto'
import dotenv from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { defaultPaks } from './data/default-paks.js'

dotenv.config()

const ronPath = process.env.RON_PATH
const syncMaps = process.env.SYNC_MAPS?.toLowerCase() === 'true'

const pakPath = `${ronPath}\\ReadyOrNot\\Content\\Paks`

export const downloadPak = (pak: ManifestPak) => {}

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
      hashFn.write(readFileSync(`${pakPath}\\${pak}`))
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
