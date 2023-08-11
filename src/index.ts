import dotenv from 'dotenv'
import { existsSync, renameSync, unlinkSync } from 'fs'
import fetch from 'node-fetch'
import ora from 'ora'
import { downloadPak, getHashes, handleError } from './utils.js'

dotenv.config()

const ronPath = process.env.RON_PATH
const syncMaps = process.env.SYNC_MAPS?.toLowerCase() === 'true'

const pakPath = `${ronPath}/ReadyOrNot/Content/Paks`

if (!existsSync(pakPath)) {
  handleError('Pak path does not exist')
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
    handleError('Failed to download manifest')
  }

  manifestSpinner.succeed('Downloading manifest... Success!')

  const manifest = (await req.json()) as ManifestPak[]

  console.clear()
  console.log('Hashing pak files...')
  const localPaks = await getHashes()

  const paksToRemove = localPaks.filter(
    pak => !manifest.some(mPak => mPak.hash === pak.hash)
  )

  const paksToRename = localPaks.filter(pak => {
    const mPak = manifest.find(mPak => mPak.hash === pak.hash)
    if (!mPak) return false

    return pak.filename !== mPak.filename
  })

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

  if (paksToRename.length > 0) {
    console.clear()
    const renameSpinner = ora('Renaming paks...').start()
    for (const pak of paksToRename) {
      const mPak = manifest.find(mPak => mPak.hash === pak.hash)
      if (!mPak) continue

      renameSync(`${pakPath}/${pak.filename}`, `${pakPath}/${mPak.filename}`)
    }
    renameSpinner.succeed('Renaming paks... Success!')
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

  if (paksToRename.length) {
    console.log(
      `Renamed ${paksToRename.length} paks: \n${paksToRename
        .map(pak => {
          const mPak = manifest.find(mPak => mPak.hash === pak.hash)
          if (!mPak) return ''

          return `~ ${pak.filename} -> ${mPak.filename}`
        })
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
