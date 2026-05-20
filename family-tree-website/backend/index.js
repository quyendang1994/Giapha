import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import session from 'express-session';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'family-tree-dev-session-secret';

app.use(cors());
app.use(express.json());
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Initialize lowdb
const defaultData = { members: [], users: [] };
const db = await JSONFilePreset('db.json', defaultData);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Initialize Google OAuth strategy if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));
}

// Initialize Facebook OAuth strategy if credentials are available
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback"
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  app.get('/auth/facebook', passport.authenticate('facebook'));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
}
app.get('/auth/logout', (req, res) => { req.logout(() => res.redirect('/')); });
app.get('/api/user', (req, res) => res.json(req.user || null));

const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Lấy email từ profile của Passport (Google/Facebook thường lưu trong mảng emails)
  const userEmail = req.user.emails?.[0]?.value || req.user.email;
  
  if (userEmail === process.env.ADMIN_EMAIL) {
    return next();
  }
  
  res.status(403).json({ message: 'Forbidden: You do not have admin privileges' });
};

// GET all members
app.get('/api/members', (req, res) => {
  res.json(db.data.members);
});

// GET member by ID
app.get('/api/members/:id', (req, res) => {
  const member = db.data.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
});

// POST create member
app.post('/api/members', isAdmin, async (req, res) => {
  const { firstName, lastName, birthDate, deathDate, gender, fatherId, motherId, bio, photoUrl } = req.body;
  
  const newMember = {
    id: randomUUID(),
    firstName,
    lastName,
    birthDate,
    deathDate,
    gender,
    fatherId,
    motherId,
    bio,
    photoUrl
  };

  db.data.members.push(newMember);
  await db.write();
  res.status(201).json(newMember);
});

// PUT update member
app.put('/api/members/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const index = db.data.members.findIndex(m => m.id === id);
  
  if (index === -1) return res.status(404).json({ message: 'Member not found' });

  const updatedMember = { ...db.data.members[index], ...req.body, id };
  db.data.members[index] = updatedMember;
  await db.write();
  res.json(updatedMember);
});

// DELETE member
app.delete('/api/members/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const index = db.data.members.findIndex(m => m.id === id);
  
  if (index === -1) return res.status(404).json({ message: 'Member not found' });

  db.data.members.splice(index, 1);
  await db.write();
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});