let mongoose = require('mongoose')
let Comment = require('./comment')

require('songbird')

let PostSchema = mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    data: Buffer,
    contentType: String
  },
  createDate: {
    type: String,
    required: false
  },
  updateDate: {
    type: String,
    required: false
  },
  author: String,
  username: String,
  //comments : [Comment.schema],
  commentsCount: Number
})

module.exports = mongoose.model('Post', PostSchema)