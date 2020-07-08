import { getCheerioObject } from './utils'
import { AllHtmlEntities } from 'html-entities'
import _ from 'lodash'

const mapValuesDeep = (obj, fn) =>
  _.isArray(obj)
    ? _.map(obj, (val) => mapValuesDeep(val, fn))
    : _.mapValues(obj, (val, key) =>
        _.isPlainObject(val)
          ? mapValuesDeep(val, fn)
          : fn(val, key, obj))

const entities = new AllHtmlEntities()

export default function (html, config = {}) {
  const $html = getCheerioObject(html)
  let jsonldData = {}

  $html('script[type="application/ld+json"]').each((index, item) => {
    try {
      const json = item.children[0].data
      const cleanedJson = json
        // Trim whitespace
        .trim()
        // Handle invalid escpe characters
        .replace(/([^bfrnt\\/"])\\([^bfrnt\\/"])/ig, '$1\\\\$2')
        // Strip line breaks
        .replace(/[\r\n]/g, ' ')
        // Remove trailing semicolon
        .replace(/;$/, '')

      let parsedJSON = JSON.parse(cleanedJson)
      parsedJSON = mapValuesDeep(parsedJSON, (val) => entities.decode(val))
      if (!Array.isArray(parsedJSON)) {
        parsedJSON = [parsedJSON]
      }
      parsedJSON.forEach(obj => {
        const type = obj['@type']
        jsonldData[type] = jsonldData[type] || []
        jsonldData[type].push(obj)
      })
    } catch (e) {
      if (!('errors' in jsonldData)) { jsonldData.errors = [] }
      jsonldData.errors.push(e)
      console.log(`Error in jsonld parse - ${e}`)
    }
  })

  return jsonldData
}
