import { Platform, Share } from 'react-native';

interface WebFileApi {
  createAnchor: () => { click: () => void; href: string; download: string };
  createBlobUrl: (text: string, mime: string) => string;
  revokeBlobUrl: (url: string) => void;
  append: (node: unknown) => void;
  remove: (node: unknown) => void;
}

interface SaveDeps {
  platform?: string;
  web?: WebFileApi;
  share?: (content: { message: string; title?: string }) => Promise<unknown>;
}

const browser = (): WebFileApi => ({
  createAnchor: () => document.createElement('a'),
  createBlobUrl: (text, mime) => URL.createObjectURL(new Blob([text], { type: mime })),
  revokeBlobUrl: (url) => URL.revokeObjectURL(url),
  append: (node) => document.body.appendChild(node as Node),
  remove: (node) => document.body.removeChild(node as Node),
});

/** Give the user a text file: a download in the browser, the share sheet on a phone. */
export const saveTextFile = async (
  filename: string,
  text: string,
  deps: SaveDeps = {},
  mime = 'text/csv;charset=utf-8',
): Promise<void> => {
  const platform = deps.platform ?? Platform.OS;
  if (platform === 'web') {
    const web = deps.web ?? browser();
    const url = web.createBlobUrl(text, mime);
    const anchor = web.createAnchor();
    anchor.href = url;
    anchor.download = filename;
    web.append(anchor);
    anchor.click();
    web.remove(anchor);
    web.revokeBlobUrl(url);
    return;
  }
  await (deps.share ?? Share.share)({ message: text, title: filename });
};
