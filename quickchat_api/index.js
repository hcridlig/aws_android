const express = require('express')
const mysql = require('mysql2');
const app = express()

const port = 3000;

app.listen(port, () => {
	console.log(`QuickChat app listening on port ${port}`)
});


app.get('/', (req, res) => {
  res.send('Welcome to QuickChat API!')
});

app.use(express.urlencoded({
	extended: true
}));

// Create a MySQL connection
const connection = mysql.createConnection({
	host: 'mysql',
	user: 'user',
	password: 'password',
	database: 'QuickChat'
  });

// Connect to MySQL
connection.connect((err) => {
	if (err) {
	  console.error('Error connecting to database:', err);
	  return;
	}
	console.log('Connected to MySQL database');
  });



app.get('/get_conversation', (req, res) => {
	const userId = req.query.userId;
	// Perform a query to retrieve data
	connection.query('SELECT u.username, u.picture, c.conversation_name, m.content AS last_message, m.Timestamp AS last_message_timestamp \
	FROM ConversationUser cu \
	JOIN conversation c ON cu.id_conversation = c.id_conversation \
	JOIN ConversationUser cu2 ON c.id_conversation = cu2.id_conversation AND cu.id_user != cu2.id_user \
	JOIN users u ON cu2.id_user = u.id_user \
	LEFT JOIN ( \
		SELECT id_conversation, MAX(Timestamp) AS max_timestamp \
		FROM messages \
		GROUP BY id_conversation \
	) max_msg ON c.id_conversation = max_msg.id_conversation \
	LEFT JOIN messages m ON max_msg.id_conversation = m.id_conversation AND max_msg.max_timestamp = m.Timestamp \
	WHERE cu.id_user = ?', [userId], (err, results) => {
	  if (err) {
		console.error('Error fetching data:', err);
		res.status(500).send('Error fetching data');
		return;
	  }
	  res.json(results); // Send the retrieved data as JSON
	});
  });

app.post('/login', (req, res) => {
	const { username, password } = req.body;

	if (username && password) {
		// Check if the username exists in the database
		connection.query('SELECT * FROM users WHERE username = ?', [username], (err, checkResult) => {
		if (err) {
			console.error('Error checking username:', err);
			res.status(500).send('Internal Server Error');
			return;
		}

		if (checkResult.length > 0) {
			// User exists, attempt login
			connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, loginResult) => {
			if (err) {
				console.error('Error checking password:', err);
				res.status(500).send('Internal Server Error');
				return;
			}

			if (loginResult.length > 0) {
				// User exists and login successful
				res.send('Connexion réussie');
			} else {
				// User exists but password is incorrect
				res.send('Mot de passe incorrect');
			}
			});
		} else {
			// User doesn't exist, create a new account
			connection.query('INSERT INTO users (username, password, picture) VALUES (?, ?, ?)', [username, password, ''], (err, createResult) => {
			if (err) {
				console.error('Error creating account:', err);
				res.status(500).send('Internal Server Error');
				return;
			}

			// Account created successfully
			res.send('Compte créé');
			});
		}
		});
	} else {
		res.status(400).send('Bad Request: Missing username or password');
	}
});

app.get('/get_users', (req, res) => {
	const search = `%${req.query.search}%`;
	console.log(search);
	// Perform a query to retrieve data
	connection.query("SELECT picture, username FROM users WHERE username LIKE ?", [search] , (err, results) => {
	  if (err) {
		console.error('Error fetching data:', err);
		res.status(500).send('Error fetching data');
		return;
	  }
	  res.json(results); // Send the retrieved data as JSON
	});
  
});


// Add a new endpoint to get all messages for a conversation
app.get('/get_messages', (req, res) => {
	const conversationId = req.query.conversationId;
  
	// Perform a query to retrieve messages for the specified conversation
	connection.query('SELECT m.id_message, m.content, m.Timestamp, u.username AS sender_username \
	  FROM messages m \
	  JOIN users u ON m.id_sender = u.id_user \
	  WHERE m.id_conversation = ?', [conversationId], (err, results) => {
	  if (err) {
		console.error('Error fetching messages:', err);
		res.status(500).send('Error fetching messages');
		return;
	  }
	  res.json(results); // Send the retrieved messages as JSON
	  console.log(results);
	});
  });
  