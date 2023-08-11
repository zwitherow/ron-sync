import dotenv from 'dotenv'
import { existsSync, unlinkSync } from 'fs'
import fetch from 'node-fetch'
import { downloadPak, getHashes } from './utils.js'

dotenv.config()

const ronPath = process.env.RON_PATH
const syncMaps = process.env.SYNC_MAPS?.toLowerCase() === 'true'

const pakPath = `${ronPath}/ReadyOrNot/Content/Paks`

if (!existsSync(pakPath)) {
  console.error('Pak path does not exist')
  process.exit(1)
}

console.log('\n\n\n')
main()

async function main() {
  console.log('Downloading manifest...')
  const req = await fetch(
    'https://cloud.zro.gg/s/GAEqgrFQHMZxoQf/download?path=%2F&files=manifest.json'
  )

  if (!req.ok) {
    console.error('Failed to fetch manifest')
    process.exit(1)
  }

  const manifest = (await req.json()) as ManifestPak[]
  const localPaks = getHashes()

  const paksToRemove = localPaks.filter(
    pak => !manifest.some(mPak => mPak.hash === pak.hash)
  )

  const paksToInstall = manifest.filter(mPak => {
    if (!syncMaps && mPak.url.includes('%2F' + 'maps' + '%2F')) {
      return false
    }

    return !localPaks.some(pak => pak.hash === mPak.hash)
  })

  if (paksToRemove.length > 0) {
    console.log('Removing old pak files...')
    for (const pak of paksToRemove) {
      unlinkSync(`${pakPath}/${pak.filename}`)
    }
  }

  if (paksToInstall.length > 0) {
    console.log('Installing new pak files...')
    for (const pak of paksToInstall) {
      await downloadPak(pak)
    }
  }

  console.log('\n\n')
  console.log('Done!')
  process.exit(0)
}
