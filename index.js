const UpdateYoutube = require("./lib/updateYoutubeDL")
const { downloadVideo, getManifest, wgetVideo } = require("./lib/youtubeDL")

const Q = require("bluebird")
const { flatten } = require("lodash")
const { readFileSync } = require("fs")
const parseString = Q.promisify(require("xml2js").parseString)
const SIDX = require("node-dash-sidx")

module.exports = (
  videoIDs = [],
  options = { updateYoutube: false, itags: [] }
) => {
  const { updateYoutube = false, itags = [] } = options
  return UpdateYoutube(updateYoutube).then(youtubeDLPath => {
    return Q.map(
      videoIDs,
      id => {
        return getManifest(id).then(manifestString => {
          return parseString(manifestString).then(xml => {
            const { Period } = xml.MPD
            const { AdaptationSet } = Period[0]
            const videoAdaptation = AdaptationSet[1]
            const { Representation } = videoAdaptation
            return Q.map(
              Representation,
              r => {
                const { SegmentBase, $ } = r
                const itag = $.id
                if (itags.length && itags.indexOf(itag) < 0) {
                  return Q.resolve([])
                }
                const BaseURL = r.BaseURL[0]._ || r.BaseURL[0]
                const ext =
                  BaseURL.indexOf("mp4") > -1 ? "mp4" : "webm"

                return Q.all([
                  wgetVideo(
                    id,
                    Object.assign({}, options, {
                      format: itag,
                      ext: ext,
                    })
                  ),

                  SIDX.start({
                    id: id,
                    itags: [itag],
                  }).then(r => {
                    console.log(r);
                    return r
                  }),
                ]).then(sidxVideoArray => flatten(sidxVideoArray))
              },
              { concurrency: 1 }
            )
          })
        })
      },
      { concurrency: 1 }
    ).then(results => flatten(results).filter(r => r.length))
  })
}
