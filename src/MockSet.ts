import { mock } from 'intermock';
import { readFiles, FileTuples } from 'intermock/build/src/lib/read-files';
import { readdir } from 'fs';
import { promisify } from 'util';

interface Options {
  paths: string[];
  extension?: string;
  interfaces?: string[];
}

const listFiles = promisify(readdir);

const isRecord = (o: any): o is Record<string, any> =>
  o != null &&
  typeof o === 'object' &&
  !(o instanceof Array) &&
  Object.keys(o).reduce(
    (result, key) => result && typeof key === 'string',
    true
  );

export class MockSet {
  declarationPaths: string[];
  fileNames: string[];
  fileData: FileTuples;
  mocks: Record<string, any>;
  extension: string;
  interfaces?: string[];
  constructor(options: Options) {
    this.declarationPaths = options.paths;
    this.extension = options.extension || '.d.ts';
    this.interfaces = options.interfaces;
  }

  async init(): Promise<void> {
    this.fileNames = await this.getAllFiles(this.declarationPaths);
    console.log(this.fileNames);
    this.fileData = await readFiles(this.fileNames);
    const mocks = mock({
      output: 'object',
      files: this.fileData,
      isFixedMode: true,
      interfaces: this.interfaces,
    });
    if (!isRecord(mocks)) throw new Error('unable to generate mocks');
    this.mocks = mocks;
  }

  async getAllFiles(paths: string[]): Promise<string[]> {
    const fileList = [];
    for (let path of paths) {
      path = path.replace(/\/$/, '');
      path = path.startsWith('./') ? path : `./${path}`;
      const contents = await listFiles(path, { withFileTypes: true });
      for (const file of contents) {
        if (file.isFile() && file.name.endsWith(this.extension))
          fileList.push(`${path}/${file.name}`);
        if (file.isDirectory())
          fileList.push(...(await this.getAllFiles([`${path}/${file.name}`])));
      }
    }
    return fileList;
  }
}
