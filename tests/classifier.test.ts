import { classifyCookie } from '../src/classifier/index.js';

describe('classifyCookie', () => {
  it('marks known trackers as red', () => {
    const cookie = { name: '_ga', domain: 'example.com' } as any;
    expect(classifyCookie(cookie)).toEqual({
      category: 'red',
      purpose: 'Tracking/Marketing'
    });
  });

  it('marks unknown cookies as green', () => {
    const cookie = { name: 'sessionid', domain: 'example.com' } as any;
    expect(classifyCookie(cookie)).toEqual({
      category: 'green',
      purpose: 'Essentiell'
    });
  });
});
