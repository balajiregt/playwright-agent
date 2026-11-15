import {test,expect} from '@playwright/test';
test('calculates the numeric quote @quote',async({page})=>{
 await page.goto('/');await page.getByLabel('Quantity').fill('2');
 await page.getByRole('button',{name:'Calculate quote'}).click();
 await expect(page.getByRole('status')).toHaveText('Calculated');
 // Deliberately incomplete currency assertion, to exercise a real survivor.
 await expect(page.getByTestId('quote')).toHaveText(/^24 /);
});
