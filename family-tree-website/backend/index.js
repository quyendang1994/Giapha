import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { JSONFilePreset } from 'lowdb/node';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize lowdb
const defaultData = { members: [] };
const db = await JSONFilePreset('db.json', defaultData);

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
app.post('/api/members', async (req, res) => {
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
app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const index = db.data.members.findIndex(m => m.id === id);
  
  if (index === -1) return res.status(404).json({ message: 'Member not found' });

  const updatedMember = { ...db.data.members[index], ...req.body, id };
  db.data.members[index] = updatedMember;
  await db.write();
  res.json(updatedMember);
});

// DELETE member
app.delete('/api/members/:id', async (req, res) => {
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