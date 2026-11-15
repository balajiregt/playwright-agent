import { test, expect } from '../fixtures/crm.fixture';

test.describe('tasks', () => {
  test('tasks are listed by due date, earliest first', async ({ signInAs, tasks, work }) => {
    await signInAs('admin');
    await tasks.goto('/tasks');
    await work.expectTaskOrder(['Archive old leads', 'Send Contoso proposal', 'Fix billing contact', 'Call Northwind', 'Prepare QBR deck']);
  });

  test('open tasks past their due date are overdue', async ({ signInAs, tasks, work }) => {
    await signInAs('admin');
    await tasks.goto('/tasks');
    await work.expectTaskOverdue('Send Contoso proposal', true);
    await work.expectTaskOverdue('Fix billing contact', true);
    await work.expectTaskOverdue('Call Northwind', false);
  });

  test('completed tasks are not overdue', async ({ signInAs, tasks, work }) => {
    await signInAs('admin');
    await tasks.goto('/tasks');
    await work.expectTaskOverdue('Archive old leads', false);
    await work.expectTaskDone('Archive old leads');
  });

  test('adding a task places it by due date', async ({ signInAs, tasks, work }) => {
    await signInAs('sales');
    await tasks.addTask('Book demo', '2026-11-18');
    await work.expectToast('Task added');
    await work.expectTaskOrder(['Archive old leads', 'Send Contoso proposal', 'Fix billing contact', 'Book demo', 'Call Northwind', 'Prepare QBR deck']);
  });

  test('a task needs a title', async ({ signInAs, tasks, work }) => {
    await signInAs('sales');
    await tasks.goto('/tasks');
    await tasks.fill({ 'Due date': '2026-11-30' });
    await tasks.submit('Add task');
    await work.expectFieldError('title', 'Title is required');
  });

  test('a task needs a due date', async ({ signInAs, tasks, work }) => {
    await signInAs('sales');
    await tasks.goto('/tasks');
    await tasks.fill({ 'Task title': 'No due date' });
    await tasks.submit('Add task');
    await work.expectFieldError('dueOn', 'Due date is required');
  });

  test('the assignee completes their own task', async ({ signInAs, tasks, work }) => {
    await signInAs('sales');
    await tasks.goto('/tasks');
    await tasks.complete('Call Northwind');
    await work.expectToast('Task completed');
    await work.expectTaskDone('Call Northwind');
  });

  test('a user cannot complete someone else’s task', async ({ signInAs, tasks, work }) => {
    await signInAs('sales');
    await tasks.goto('/tasks');
    await tasks.complete('Fix billing contact');
    await work.expectToast('Only the assignee or an admin can complete this task');
  });

  test('an admin can complete any task', async ({ apiAs }) => {
    const api = await apiAs('admin');
    const response = await api.post('/api/tasks/t4/complete');
    expect(response.status()).toBe(200);
    expect((await response.json()).done).toBe(true);
  });

  test('viewers cannot add tasks', async ({ signInAs, tasks }) => {
    await signInAs('viewer');
    await tasks.goto('/tasks');
    await expect(tasks.page.getByTestId('task-form')).toHaveCount(0);
  });
});
