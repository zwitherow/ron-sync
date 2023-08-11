import dotenv from 'dotenv'
import { existsSync, unlinkSync } from 'fs'
import fetch from 'node-fetch'
import ora from 'ora'
import { downloadPak, getHashes } from './utils.js'

dotenv.config()

const ronPath = process.env.RON_PATH
const syncMaps = process.env.SYNC_MAPS?.toLowerCase() === 'true'

const pakPath = `${ronPath}/ReadyOrNot/Content/Paks`

if (!existsSync(pakPath)) {
  console.error('Pak path does not exist')
  process.exit(1)
}

console.clear()

main()

async function main() {
  const manifestSpinner = ora('Downloading manifest...').start()
  const req = await fetch(
    'https://cloud.zro.gg/s/GAEqgrFQHMZxoQf/download?path=%2F&files=manifest.json'
  )

  if (!req.ok) {
    manifestSpinner.fail()
    console.error('Failed to download manifest')
    process.exit(1)
  }

  manifestSpinner.succeed('Downloading manifest... Success!')

  const manifest = (await req.json()) as ManifestPak[]

  console.clear()
  console.log('Hashing pak files...')
  const localPaks = await getHashes()

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
    console.clear()
    const removeSpinner = ora('Removing old paks...').start()
    for (const pak of paksToRemove) {
      unlinkSync(`${pakPath}/${pak.filename}`)
    }
    removeSpinner.succeed('Removing old paks... Success!')
  }

  if (paksToInstall.length > 0) {
    for (const pak of paksToInstall) {
      console.clear()
      console.log(
        `Downloading pak files... (${paksToInstall.indexOf(pak) + 1} of ${
          paksToInstall.length
        })`
      )
      await downloadPak(pak)
    }
  }

  console.clear()
  if (paksToRemove.length) {
    console.log(
      `Removed ${paksToRemove.length} paks: \n${paksToRemove
        .map(pak => `- ${pak.filename}`)
        .join('\n')}\n`
    )
  }

  if (paksToInstall.length) {
    console.log(
      `Installed ${paksToInstall.length} paks: \n${paksToInstall
        .map(pak => `+ ${pak.filename}`)
        .join('\n')}\n`
    )
  }

  console.log('Finished syncing. Press any key to exit...')

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', process.exit.bind(process, 0))
}
