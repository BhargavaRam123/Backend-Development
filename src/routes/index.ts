import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Express API' });
});

router.get('/users', (req: Request, res: Response) => {
  res.json({ 
    users: [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ]
  });
});

router.post('/users', (req: Request, res: Response) => {
  const { name } = req.body;
  res.status(201).json({ id: Date.now(), name });
});

router.get('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ id, name: 'User Name' });
});

export default router;