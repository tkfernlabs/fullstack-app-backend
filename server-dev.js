const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store (for development/demo purposes)
const dataStore = {
  users: [],
  posts: [],
  nextUserId: 1,
  nextPostId: 1
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mode: 'in-memory-storage'
  });
});

// User registration
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const userExists = dataStore.users.find(u => u.email === email);
    if (userExists) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: dataStore.nextUserId++,
      email,
      password: hashedPassword,
      name,
      created_at: new Date().toISOString()
    };

    dataStore.users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        created_at: newUser.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const user = dataStore.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile (protected route)
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const user = dataStore.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    }
  });
});

// Get all posts
app.get('/api/posts', (req, res) => {
  const postsWithAuthors = dataStore.posts.map(post => {
    const author = dataStore.users.find(u => u.id === post.user_id);
    return {
      ...post,
      author_name: author ? author.name : 'Unknown',
      author_email: author ? author.email : 'unknown@example.com'
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ posts: postsWithAuthors });
});

// Create a new post (protected route)
app.post('/api/posts', authenticateToken, [
  body('title').notEmpty().trim(),
  body('content').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content } = req.body;

  const newPost = {
    id: dataStore.nextPostId++,
    title,
    content,
    user_id: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  dataStore.posts.push(newPost);

  res.status(201).json({
    message: 'Post created successfully',
    post: newPost
  });
});

// Update a post (protected route)
app.put('/api/posts/:id', authenticateToken, [
  body('title').optional().trim(),
  body('content').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const postId = parseInt(req.params.id);
  const { title, content } = req.body;

  const postIndex = dataStore.posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = dataStore.posts[postIndex];
  
  if (post.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to edit this post' });
  }

  // Update fields if provided
  if (title) post.title = title;
  if (content) post.content = content;
  post.updated_at = new Date().toISOString();

  res.json({
    message: 'Post updated successfully',
    post
  });
});

// Delete a post (protected route)
app.delete('/api/posts/:id', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);

  const postIndex = dataStore.posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = dataStore.posts[postIndex];
  
  if (post.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to delete this post' });
  }

  // Remove post
  dataStore.posts.splice(postIndex, 1);

  res.json({ message: 'Post deleted successfully' });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Full-Stack App API',
    version: '1.0.0',
    endpoints: {
      public: [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/posts'
      ],
      protected: [
        'GET /api/users/profile',
        'POST /api/posts',
        'PUT /api/posts/:id',
        'DELETE /api/posts/:id'
      ]
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
  console.log(`API endpoints available at http://0.0.0.0:${port}/api`);
  console.log('Running with in-memory storage (development mode)');
});
