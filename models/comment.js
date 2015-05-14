let mongoose = require('mongoose')

require('songbird')

let CommentSchema = mongoose.Schema({
  userComment: {
    type: String,
    required: true
  },
  commenter: String,
  postAuthor: String,
  postId: String
})

module.exports = mongoose.model('Comment', CommentSchema)