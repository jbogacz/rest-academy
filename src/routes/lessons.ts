import { Router, Request, Response } from 'express';
import { lessons, modules } from '../lessons/registry';
import { verifyLesson } from '../lessons/verifiers';
import { NotFoundError } from '../models/errors';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LessonModule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         lessons:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LessonSummary'
 *     LessonSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         verificationType:
 *           type: string
 *           enum: [state, quiz, exploration]
 *     LessonDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         moduleId:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         task:
 *           type: string
 *         verificationType:
 *           type: string
 *           enum: [state, quiz, exploration]
 *     VerifyRequest:
 *       type: object
 *       properties:
 *         answer:
 *           type: string
 *           description: Your answer (required for quiz-type lessons)
 *           example: "200"
 *     VerificationResult:
 *       type: object
 *       properties:
 *         lessonId:
 *           type: integer
 *         passed:
 *           type: boolean
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /lessons:
 *   get:
 *     tags: [Lessons]
 *     summary: List all lessons grouped by module
 *     description: |
 *       Returns all available lessons organized into modules.
 *       **Start here!** This is your curriculum for learning REST APIs.
 *
 *       Each module builds on the previous one:
 *       1. **REST Basics** - GET requests, parameters, status codes
 *       2. **CRUD Operations** - POST, PUT, PATCH, DELETE
 *       3. **Relationships** - Nested resources, business rules
 *       4. **Advanced Operations** - Transfers, idempotency
 *       5. **Query & Pagination** - Filtering, sorting, pagination
 *       6. **HTTP Deep Dive** - Headers, ETags, CORS
 *     responses:
 *       200:
 *         description: All lessons grouped by module
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LessonModule'
 */
router.get('/', (_req: Request, res: Response) => {
  const grouped = modules.map((mod) => ({
    ...mod,
    lessons: lessons
      .filter((l) => l.moduleId === mod.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        verificationType: l.verificationType,
      })),
  }));

  res.json({ data: grouped });
});

/**
 * @swagger
 * /lessons/{id}:
 *   get:
 *     tags: [Lessons]
 *     summary: Get lesson details
 *     description: Returns the full details of a lesson including its description, task, and verification type.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lesson ID (1-27)
 *         example: 1
 *     responses:
 *       200:
 *         description: Lesson details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LessonDetail'
 *       404:
 *         description: Lesson not found
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) throw new NotFoundError('Lesson', req.params.id);

  const module = modules.find((m) => m.id === lesson.moduleId);

  res.json({
    data: {
      id: lesson.id,
      moduleId: lesson.moduleId,
      moduleName: module?.title,
      title: lesson.title,
      description: lesson.description,
      task: lesson.task,
      verificationType: lesson.verificationType,
    },
  });
});

/**
 * @swagger
 * /lessons/{id}/hint:
 *   get:
 *     tags: [Lessons]
 *     summary: Get a hint for a lesson
 *     description: Returns a hint to help you complete the lesson task. Use this if you're stuck!
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Lesson hint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     lessonId:
 *                       type: integer
 *                     hint:
 *                       type: string
 *       404:
 *         description: Lesson not found
 */
router.get('/:id/hint', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) throw new NotFoundError('Lesson', req.params.id);

  res.json({
    data: {
      lessonId: lesson.id,
      hint: lesson.hint,
    },
  });
});

/**
 * @swagger
 * /lessons/{id}/verify:
 *   post:
 *     tags: [Lessons]
 *     summary: Verify lesson completion
 *     description: |
 *       Check if you've completed a lesson task.
 *
 *       **Verification types:**
 *       - **quiz** - Submit your answer in the request body: `{"answer": "your answer"}`
 *       - **state** - The system checks if you performed the required action (e.g., created an account)
 *       - **exploration** - The system checks if you made the required API request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 4
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyRequest'
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/VerificationResult'
 *       404:
 *         description: Lesson not found
 */
router.post('/:id/verify', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const answer = req.body?.answer;

  const result = verifyLesson(id, answer !== undefined ? String(answer) : undefined);
  res.json({ data: result });
});

export default router;
