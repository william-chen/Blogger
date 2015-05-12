let fs = require('fs')
let DataUri = require('datauri')
let multiparty = require('multiparty')
let then = require('express-then')
let moment = require('moment')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')

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

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      post: req.post,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/post/:postId?', then(async (req, res) => {
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

  app.post('/post/:postId?', then(async (req, res) => {
    let postId = req.params.postId
    if (!postId) {
      let post = new Post()
      //let timestamp = moment().format('MMMM Do YYYY, h:mm:ss a')
      let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(req)
      post.title = title
      post.content = content
      post.image.data = await fs.promise.readFile(file.path)
      post.image.contentType = file.headers['content-type']
      //post.createDate = timestamp
      //post.updateDate = timestamp
      await post.save()
      res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      //res.render('profile.ejs', {
      //  post: post
      //})
      return
    }
    
    // Edit POST
    let post = await Post.findById(postId)
    if (!post) res.send(404, 'Not Found')

    post.title = req.body.title
    post.content = req.body.content
    post.image.data = await fs.promise.readFile(req.files.image.path)
    post.image.contentType = req.files.image.mimetype
    post.updateDate = moment().format('MMMM Do YYYY, h:mm:ss a')
    await post.save()
    
    let dataUri = new DataUri
    let image = dataUri.format('.' + post.image.contentType.split('/').pop(), post.image.data)
    res.render('post.ejs', {
      post: post,
      verb: 'Edit',
      image: `data:${post.image.contentType};base64,${image.base64}`
    })
    return
    
  }))
}
