import {NightwatchTests} from 'nightwatch';

const TESTING_URL = process.env['TESTING_URL'] || 'http://localhost:4200';
const home: NightwatchTests = {
  'MMLI Homepage': () => {
    browser.url(TESTING_URL).assert.visible('body');
  },
};

export default home;
