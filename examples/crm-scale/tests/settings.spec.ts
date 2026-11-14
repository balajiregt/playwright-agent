import { test, expect } from '../fixtures/crm.fixture';

test.describe('settings', () => {
  test('an admin changes the approval threshold', async ({ signInAs, settings, work, quotes }) => {
    await signInAs('admin');
    await settings.save({ threshold: 20 });
    await work.expectToast('Settings saved');
    await quotes.goto('/quotes');
    await work.expectPage('quotes-page');
    await expect(quotes.page.getByTestId('approval-threshold')).toHaveText('Discounts above 20% need manager approval.');
  });

  test('the threshold must be between 0 and 50', async ({ signInAs, settings, work }) => {
    await signInAs('admin');
    await settings.save({ threshold: 75 });
    await work.expectFieldError('approvalThresholdPct', 'Threshold must be between 0 and 50%');
  });

  test('changing currency changes how amounts are shown', async ({ signInAs, settings, crm, work }) => {
    await signInAs('admin');
    await settings.save({ currency: 'EUR' });
    await crm.goto('/reports');
    await work.expectMetric('pipeline-total', 'EUR 220,000.00');
  });

  test('managers see settings read-only', async ({ signInAs, settings, work }) => {
    await signInAs('manager');
    await settings.goto('/settings');
    await work.expectReadOnlyBanner();
    await work.expectDisabled(settings.page.getByRole('button', { name: 'Save settings' }));
  });
});
