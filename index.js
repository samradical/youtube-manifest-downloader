const UpdateYoutube = require('./lib/updateYoutubeDL');
const { downloadVideo, getManifest } = require('./lib/youtubeDL');

const Q = require('bluebird');
const { flatten } = require('lodash')
const { readFileSync } = require('fs')
const parseString = Q.promisify(require('xml2js').parseString);

module.exports = (videoIDs = [], options = { updateYoutube: false }) => {
  const { updateYoutube } = options

  return UpdateYoutube(updateYoutube)
    .then(youtubeDLPath => {
      return Q.map(videoIDs, id => {
        return getManifest(id)
          .then(manifestString => {
            return parseString(manifestString).then(xml => {
              const { Period } = xml.MPD
              const { AdaptationSet } = Period[0]

              const videoAdaptation = AdaptationSet[1]
              const { Representation } = videoAdaptation
              return Q.map(Representation, r => {
                const { SegmentBase, $ } = r
                const BaseURL = r.BaseURL[0]._
                const ext = BaseURL.indexOf('video/mp4') > -1 ? "mp4" : "webm"
                return downloadVideo(id, Object.assign({}, options, {
                  format: $.id,
                  ext: ext
                }))
              }, { concurrency: 1 })
            })
          })
      }, { concurrency: 1 })
      .then(results=> flatten(results))
    })
}
