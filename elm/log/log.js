import fs from 'fs'
import dayjs from 'dayjs'
// import yaml from 'yaml'

// let a = yaml.parseAllDocuments(fs.readFileSync('elm/log/all.yaml', 'utf8'))
// console.log(a[0].toJSON().params)

export default function log(err) {
  const time = dayjs().format('YYYY/MM/DD HH:mm:ss')
  try {
    fs.appendFileSync('elm/log/log.txt', JSON.stringify({ time, ...err }) + ',' + '\n')
  } catch (error) {
    fs.appendFileSync('elm/log/log.txt', err + '\n')
  }
}
