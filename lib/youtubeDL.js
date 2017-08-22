const Q = require("bluebird")
const xhr = Q.promisify(require("xhr-request"))
const path = require("path")
const colors = require("colors")
const { compact, flatten } = require("lodash")
const spawn = require("child_process").spawnSync

const wgetVideo = (id, options = {}) => {
  return new Q((yes, no) => {
    if (!id) return no(new Error(`No video ID supplied`))

    options = Object.assign(
      {},
      {
        format: null,
        youtubeDLPath: "youtube-dl",
        save: __dirname,
      },
      options
    )
    const { format, youtubeDLPath, save, ext } = options

    const output = `${id}_${format}`

    console.log(colors.green(`Getting url for ${id} `))

    const cmd = compact([
      `https://www.youtube.com/watch?v=${id}`,
      `${!!format ? "-f" : null}`,
      `${!!format ? `${format}` : null}`,
      "-g",
    ])

    console.log(colors.yellow(cmd.join(" ")))

    const child = spawn(`${youtubeDLPath}`, cmd)

    const stderr = child.stderr.toString("utf-8")
    const videoUrl = child.stdout.toString("utf-8")

    const videoPath = path.join(save, `${output}.${ext}`)
    const wget = spawn(`wget`, [
      `${videoUrl}`,
      "-O",
      videoPath,
    ])

    yes(videoPath)
  })
}

const downloadVideo = (id, options = {}) => {
  return new Q((yes, no) => {
    if (!id) return no(new Error(`No video ID supplied`))

    options = Object.assign(
      {},
      {
        format: null,
        youtubeDLPath: "youtube-dl",
        save: __dirname,
      },
      options
    )
    const { format, youtubeDLPath, save, ext } = options

    const output = `${id}_${format}`

    console.log(colors.green(`Downloading ${id} to ${output}`))
    const cmd = compact([
      `https://www.youtube.com/watch?v=${id}`,
      `${!!format ? "-f" : null}`,
      `${!!format ? `${format}+bestaudio` : null}`,
      "-o",
      path.join(save, `${output}.%(ext)s`),
    ])

    console.log(colors.yellow(cmd.join(" ")))

    const child = spawn(`${youtubeDLPath}`, cmd)

    const stderr = child.stderr.toString("utf-8")
    const stdout = child.stdout.toString("utf-8")

    const videoPath = path.join(save, `${output}.${ext}`)
    yes(videoPath)
  })
}

const getManifest = (
  id,
  options = { youtubeDLPath: "youtube-dl" }
) => {
  return new Q((yes, no) => {
    const { youtubeDLPath } = options
    const child = spawn(`${youtubeDLPath}`, [
      `-j`,
      `https://www.youtube.com/watch?v=${id}`,
    ])
    const stderr = child.stderr.toString("utf-8")
    const stdout = JSON.parse(child.stdout.toString("utf-8"))

    const { requested_formats } = stdout
    const manifestUrl = compact(
      requested_formats.map(fmt => fmt.manifest_url)
    )

    if (!manifestUrl[0]) {
      return no(new Error(`No Manifest url for ${id}`))
    }
    return xhr(manifestUrl[0])
      .then(d => {
        console.log(colors.green(`Got manifest data for ${id}`))
        yes(d)
      })
      .catch(err => {
        no(err)
      })
  })
}

module.exports = { downloadVideo, wgetVideo, getManifest }
