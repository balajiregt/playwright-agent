import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',grep:/@quote/,use:{baseURL:process.env.APP_URL},
 webServer:{command:'node app/server.mjs',url:process.env.APP_URL!,reuseExistingServer:false},
 projects:[{name:'chromium',testDir:'./tests',grep:/@quote/,use:{browserName:'chromium'}}],
});
