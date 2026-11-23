import { saveTextFile } from '../../core/utils/saveTextFile';

describe('saving a text file', () => {
  it('on the web it offers the text as a download with the given name and then lets go of it', async () => {
    const click = jest.fn();
    const anchor: any = { click, href: '', download: '' };
    const appended: any[] = [];
    const web = {
      createAnchor: () => anchor,
      createBlobUrl: jest.fn(() => 'blob:abc'),
      revokeBlobUrl: jest.fn(),
      append: (node: any) => appended.push(node),
      remove: jest.fn(),
    };
    await saveTextFile('daily_collection.csv', 'Date,Total\n', { platform: 'web', web });
    expect(web.createBlobUrl).toHaveBeenCalledWith('Date,Total\n', 'text/csv;charset=utf-8');
    expect(anchor.href).toBe('blob:abc');
    expect(anchor.download).toBe('daily_collection.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(appended).toEqual([anchor]);
    expect(web.remove).toHaveBeenCalledWith(anchor);
    expect(web.revokeBlobUrl).toHaveBeenCalledWith('blob:abc');
  });

  it('on a phone it hands the text to the share sheet', async () => {
    const share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
    await saveTextFile('daily_collection.csv', 'Date,Total\n', { platform: 'native', share });
    expect(share).toHaveBeenCalledWith({ message: 'Date,Total\n', title: 'daily_collection.csv' });
  });
});
