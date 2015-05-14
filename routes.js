let fs = require('fs')
let DataUri = require('datauri')
let multiparty = require('multiparty')
let then = require('express-then')
let moment = require('moment')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let User = require('./user')
let Comment = require('./models/comment')

module.exports = (app) => {
  let passport = app.passport

  app.get('/', (req, res) => {
    res.render('index.ejs')
  })

  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error')})
  })
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))

  app.get('/profile', isLoggedIn, then(async (req, res) => {
    let posts = await Post.promise.find({author: req.user.email})
    res.render('profile.ejs', {
      user: req.user,
      posts: posts,
      message: req.flash('error')
    })
  }))

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/post/:postId?', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    if (!postId) {
      res.render('post.ejs', {
        post: {},
        verb: 'Create'
      })
      return
    } else {
      let post = await Post.promise.findById(postId)
      if (!post) res.send(404, 'Not Found')

      let dataUri = new DataUri
      let image = dataUri.format('.' + post.image.contentType.split('/').pop(), post.image.data)
      //console.log(image)
      res.render('post.ejs', {
        post: post,
        verb: 'Edit',
        image: `data:${post.image.contentType};base64,${image.base64}`
      })
    }
  }))

  app.post('/post/:postId?', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(req)
    console.log(title)
    console.log(content)
    console.log(file)
    // Add New POST
    if (!postId) {
      let post = new Post()
      let user = new User()
      let timestamp = moment().format('MMMM Do YYYY, h:mm:ss a')
      //let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(req)
      post.title = title
      post.content = content
      post.image.data = await fs.promise.readFile(file.path)
      post.image.contentType = file.headers['content-type']
      // Record create & update timestamp
      post.createDate = timestamp
      post.updateDate = timestamp
      post.commentsCount = 0
      post.author = req.user.email
      post.username = req.user.username
      await post.save()
      console.log(req.user)
      let posts = await Post.promise.find({author: req.user.email})
      console.log(posts)
      
      //res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      res.render('profile.ejs', {
        user: req.user,
        posts: posts
      })
      return 

    } else {
      // Edit POST
      let mpost = await Post.promise.findById(postId)
      if (!mpost) res.send(404, 'Not Found')

      mpost.title = title
      mpost.content = content
      
      mpost.image.data = await fs.promise.readFile(file.path)
      mpost.image.contentType = file.headers['content-type']
      mpost.updateDate = moment().format('MMMM Do YYYY, h:mm:ss a')
    
      let dataUri = new DataUri
      let image = dataUri.format('.' + mpost.image.contentType.split('/').pop(), mpost.image.data)
      res.render('post.ejs', {
        post: mpost,
        verb: 'Edit',
        image: `data:${mpost.image.contentType};base64,${image.base64}`
      })
      return await mpost.save()
    }
  }))

  app.get('/blog/:username', isLoggedIn, then(async (req, res) => {
    let username = req.params.username
    let user = await User.promise.findOne({username})
    if (!user || user.blogTitle == "") {
      res.send(404, `Blog for %{user} is not found!`)
      return
    } else {
      let posts = await Post.promise.find({username})
      let dataUri = new DataUri
      let images = []
      let image
      console.log(posts)
      for (let i=0; i< posts.length-1; i++){
        image = dataUri.format('.' + posts[i].image.contentType.split('/').pop(), posts[i].image.data)
        console.log(image)
        console.log('I am here')
        images.push(`data:${posts[i].image.contentType};base64,${image.base64}`)
      }
      //console.log(images)
      res.render('blog.ejs', {
        posts: posts,
        originalAuthor: username,
        images: images,
        req: req
      })
    }
    return
  }))

  app.post('/post/:postId/comments/:author', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    let author = req.params.author
    let commentContent = req.body.comment
    let post = await Post.promise.findById(postId)
    if (!post) res.send(404, `Blog post with id %{postId} not found`)
    console.log(req.body)
    let comment = new Comment()
    comment.userComment = commentContent
    comment.postId = postId
    comment.postAuthor = author
    // TODO:
    comment.commenter = 'wchen'
    await comment.save()

    let postComments = await Comment.promise.find({postAuthor: author})
    let user = await User.promise.findOne({username: author})
    let blogPosts = await Post.promise.find({username: author})
    //res.redirect(`/blog/${author}`)
    //update comment counts in reference to the post
    //let targetPost = await Post.promise.find({postId: postId})
    post.commentsCount = post.commentsCount + 1
    await post.save()

    res.render('blog.ejs', {
      posts: blogPosts,
      originalAuthor: user,
      comments: postComments,
      req: req
    })
    return
  }))
}
