// Importování potřebných knihoven a modulů
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Inicializace Express aplikace
const app = express();
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Vytvoření HTTP serveru pomocí Express aplikace
const server = createServer(app);

// Inicializace Socket.io na serveru
const io = new Server(server);

app.use(session({
  secret: 'your_secret_key', // Změňte toto na skutečné tajemství.
  resave: false,
  saveUninitialized: true,
  cookie:{
    maxAge: 24*60*60*1000
  }
}));

// Nastavení připojení k databázi MySQL
const connection = mysql.createConnection({ // Vytvoření připojení k databázi
  host: '192.168.1.161', // Adresa hostitele databáze
  user: 'petr.spacek', // Uživatelské jméno
  password: 'Spakator445', // Heslo
  database: 'chat', // Název databáze
  port: 3001 // Port databáze
});

app.get('/setSession', (req, res) => {
  const usernameFromCookie = req.cookies.username;

  if (usernameFromCookie) {
    req.session.username = usernameFromCookie;
    res.send('User from cookie: ' + usernameFromCookie);
  } else {
    res.send('No username found in the cookie');
  }
});

app.get('/settedSession', (req, res) => {
  const username = req.session.username;

  if (username) {
    res.send('User from session: ' + username);
  } else {
    res.send('No username found in the session');
  }
});
  

app.get('/chat', (req, res) => {
  let username = req.cookies.username;

  if (!username) {
    // If it's not in the cookies, you can also check the session
    username = req.session.username;
  }

  if (username) {
    res.render('index', { username });
  } else {
    res.sendFile(join(__dirname, 'failedLogin.html'));
  }
});


// Stránka pro registraci
app.get('/register', (req, res) => {
  res.render('register');
});

// Stránka pro zpracování registrace
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Příklad: Vytvoření nového uživatele v databázi
  connection.query('INSERT INTO user (username, password) VALUES (?, ?)', [username, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send('Chyba při registraci.');
    } else {
      console.log('Uživatel byl úspěšně registrován.');
      res.redirect('/login'); // Po registraci přesměrovat na stránku přihlášení
    }
  });
});

// Stránka pro přihlášení
app.get('/login', (req, res) => {
  res.render('login.ejs');
  
});

var currentUsername;

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Příklad: Ověření uživatele v databázi
  connection.query('SELECT * FROM user WHERE (LOWER(username) = ? OR UPPER(username) = ?) AND (LOWER(password) = ? OR UPPER(password) = ?)', [username, username, password, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).send('Chyba při přihlášení.');
    } else {
      if (results.length > 0) {
        // Úspěšné přihlášení
        req.session.authenticated = true;
        req.session.username = req.body.username
        req.cookies.username = username;
        res.cookie('username', username);
        
        currentUsername = username;

        res.redirect('/chat'); // Přesměrovat na hlavní stránku
      } else {
        res.sendFile(join(__dirname, 'failedLogin.html'))
      }
    }
  });
});


// Naslouchání na události připojení klienta k Socket.io
io.on('connection', (socket) => {
  // Naslouchání na událost 'chat message' pro přijetí zprávy od klienta
  socket.on('chat message', (msg) => {
    // Odeslání zprávy všem klientům připojeným k Socket.io
    if (currentUsername) {
      io.emit('chat message', currentUsername + " : " + msg);
    } else {}
    });
  })

  // Naslouchání na události odpojení klienta od Socket.io
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      console.log('user ' + socket.id + ' disconnected');
    });
  });


  // Spuštění HTTP serveru na portu 80
  server.listen(8880, () => {
    console.log('server running at port 8880');
  });
  