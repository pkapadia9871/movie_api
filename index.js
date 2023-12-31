const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;

/*mongoose.connect('mongodb://127.0.0.1/test', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
  });*/

  /*mongoose.connect('mongodb+srv://parikkapadia21:SmeagolGollum9871%40@cluster0.smxn0zf.mongodb.net/?retryWrites=true&w=majority', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
  });*/

    mongoose.connect(process.env.CONNECTION_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
  });


const express = require('express'),
morgan = require('morgan'),
fs = require('fs'), // import built in node modules fs and path 
path = require('path');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const { check, validationResult } = require('express-validator');

const cors = require('cors');

let allowedOrigins = ['http://localhost:8080', 'http://testsite.com', "http://localhost:1234", "https://magnificent-maamoul-1c1be6.netlify.app", "http://localhost:4200"];

app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');

app.use(morgan('common'));

// create a write stream (in append mode)
// a ‘log.txt’ file is created in root directory
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));

  // GET requests
  app.get('/', (req, res) => {
    res.send('Welcome to my book club!');
  });
  
  app.get('/documentation', (req, res) => {                  
    res.sendFile('public/documentation.html', { root: __dirname });
  });
  
  /*Return a list of ALL movies to the user */
  app.get('/movies', /*passport.authenticate('jwt', { session: false }),*/ async (req, res) => {
    /*res.json(movies);*/
    Movies.find().then(movies => res.json(movies));
  });

   /*Return a list of ALL users to the user (for debugging) */
   app.get('/users' , async (req, res) => {
    /*res.json(movies);*/
    Users.find().then(users => res.json(users));
  });
  
  /**
  * Return data about a single movie by title to the user
  * @name getOneMovie
  * @param {string} title
  * @kind function
  */
  app.get('/movies/:title', passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.json(movies[0]);*/
    await Movies.findOne({ Title: req.params.title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

  /**
  * Return data about a genre (description) by name/title.
  * @name getGenre
  * @param {string} genrename
  * @kind function
  */
  app.get('/movies/genres/:genrename', passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.send('Movie1, action');*/
    await Movies.findOne({ "Genre.Name": req.params.genrename })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

    /**
    * Return data about a director (bio, birth year, death year) by name.
    * @name getDirector
    * @param {string} director
    * @kind function
    */
  app.get('/movies/directors/:director', passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.send('Movie1 directed by James');*/
    await Movies.findOne({ "Director.Name": req.params.director })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

      /**
    * Allow new users to register
    * @name userRegistration
    * @param {string} Username
    * @param {string} Password
    * @param {string} Email
    * @kind function
    */
  app.post('/users' ,   [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {
    /*res.send('registered');*/
      // check the validation object for errors
      let errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
    let hashedPassword = Users.hashPassword(req.body.Password);
      await Users.findOne({ Username: req.body.Username })
        .then((user) => {
          if (user) {
            return res.status(400).send(req.body.Username + 'already exists');
          } else {
            Users
              .create({
                Username: req.body.Username,
                Password: hashedPassword,
                Email: req.body.Email,
                Birthday: req.body.Birthday
              })
              .then((user) =>{res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            })
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        });
  });

    /**
    * Allow users to update their user info (username)
    * @name editUser
    * @param {string} Username
    * @param {string} Password
    * @param {string} Email
    * @kind function
    */
  app.put('/users/:Username', [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.send('updated');*/
      // CONDITION TO CHECK ADDED HERE
        if(req.user.Username !== req.params.Username){
          return res.status(400).send('Permission denied');
      }
      // CONDITION ENDS
    
    let hashedPassword = Users.hashPassword(req.body.Password);
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    await Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
      {
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      }
    },
    { new: true }) // This line makes sure that the updated document is returned
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    })
  });

    /**
    * Allow users to add a movie to their list of favorites
    * @name addFavoriteMovie
    * @param {string} Username
    * @param {string} MovieID
    * @kind function
    */
  app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.send('registered!');*/
    await Users.findOneAndUpdate({ Username: req.params.Username }, {
      $push: { FavoriteMovies: req.params.MovieID }
    },
    { new: true }) // This line makes sure that the updated document is returned
   .then((updatedUser) => {
     res.json(updatedUser);
   })
   .catch((err) => {
     console.error(err);
     res.status(500).send('Error: ' + err);
   });
  });

    /**
    * Allow users to remove a movie from their list of favorites 
    * @name deleteFavoriteMovie
    * @param {string} Username
    * @param {string} MovieID
    * @kind function
    */
  app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }) , async (req, res) => {
    /*res.send('removed!');*/
    await Users.findOneAndUpdate({ Username: req.params.Username }, {
      $pull: { FavoriteMovies: req.params.MovieID }
    },
    { new: true }) // This line makes sure that the updated document is returned
   .then((updatedUser) => {
     res.json(updatedUser);
   })
   .catch((err) => {
     console.error(err);
     res.status(500).send('Error: ' + err);
   });
  });

    /**
    * Allow existing users to deregister
    * @name deleteUser
    * @param {string} Username
    * @kind function
    */
  app.delete('/users/:Username', 
  passport.authenticate('jwt', { session: false }) ,
  async (req, res) => {
    /*res.send('deregistered!');*/
    await Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });
  
  // listen for requests
  /*app.listen(8080, () => {
    console.log('Your app is listening on port 8080.');
  });*/
  const port = process.env.PORT || 8080;
  app.listen(port, '0.0.0.0',() => {
    console.log('Listening on Port ' + port);
  });


  app.use(express.static('public'));

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  /*const port = process.env.PORT || 8080;
  app.listen(port, '0.0.0.0',() => {
    console.log('Your app is listening on port 8080.');

  });*/