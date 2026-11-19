const cloud = require('wx-server-sdk')
const { matches, updatedAt } = require('./season.json')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => ({ matches, updatedAt })
