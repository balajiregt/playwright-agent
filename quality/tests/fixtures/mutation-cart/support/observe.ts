import {expect,type Page} from '@playwright/test';
export async function observe({page,input}:{page:Page;input:Record<string,unknown>}){
 if(input.invalidOutput)return null; // Exercises the runner's inconclusive boundary.
 await page.goto('/');await page.getByLabel('Quantity').fill(String(input.quantity));
 await page.getByRole('button',{name:'Calculate quote'}).click();
 await expect(page.getByRole('status')).toHaveText('Calculated');
 return page.getByTestId('quote').textContent();
}
