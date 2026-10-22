import { RevisionTasks, Users } from '../models/repositories.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';

export async function getRevisionTasks(req, res) {
  try {
    const userId = req.user._id || req.user.id;

    // Refresh recommendations if needed
    await syncRevisionTasksForUser(userId);

    const tasks = await RevisionTasks.find({ userId });
    const user = await Users.findById(userId);

    // Calculate completion statistics
    const completedTasks = tasks.filter((t) => t.completed);
    const pendingTasks = tasks.filter((t) => !t.completed);

    res.json({
      tasks,
      stats: {
        total: tasks.length,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      },
      examDate: user?.studyGoals?.examDate || null,
      primaryGoal: user?.studyGoals?.primaryGoal || 'General learning',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve revision planner tasks.' });
  }
}

export async function toggleTaskCompletion(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const task = await RevisionTasks.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (String(task.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const newCompleted = !task.completed;
    const updated = await RevisionTasks.findByIdAndUpdate(id, {
      completed: newCompleted,
      completedAt: newCompleted ? new Date().toISOString() : null,
    });

    res.json({ message: 'Task updated successfully.', task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task status.' });
  }
}

export async function rescheduleTask(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { newDueDate } = req.body;

    if (!newDueDate) return res.status(400).json({ error: 'New due date is required.' });

    const task = await RevisionTasks.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (String(task.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const updated = await RevisionTasks.findByIdAndUpdate(id, {
      dueDate: new Date(newDueDate).toISOString(),
    });

    res.json({ message: 'Task rescheduled successfully.', task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule task.' });
  }
}

export async function createCustomTask(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { topic, recommendedActivity, priority, dueDate, estimatedTimeMinutes } = req.body;

    if (!topic || !recommendedActivity) {
      return res.status(400).json({ error: 'Topic and recommended activity are required.' });
    }

    const task = await RevisionTasks.create({
      userId,
      topic,
      recommendedActivity,
      priority: priority || 'medium',
      activityType: 'quiz',
      dueDate: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      estimatedTimeMinutes: Number(estimatedTimeMinutes) || 15,
      completed: false,
      recommendationReason: 'Custom student study objective.',
    });

    res.status(201).json({ message: 'Task created.', task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create revision task.' });
  }
}
