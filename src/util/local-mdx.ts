import fs from 'fs';
import path from 'path';

const getMDXFilePath = (fileName: string) => {
  return path.join(process.cwd(), '/src/resource/mdx', `${fileName}.mdx`);
};

/**
 * ┌─────────┬────────────┐
 * │ (index) │ Values     │
 * ├─────────┼────────────┤
 * │ 0       │ 'example'  │
 * │ 1       │ 'example2' │
 * └─────────┴────────────┘
 */
export const getLocalMDXTitles = () => {
  const directoryPath = path.join(process.cwd(), '/src/resource/mdx');
  return fs.readdirSync(directoryPath, 'utf-8').map(e => e.split('.mdx')[0]!);
};


export const getLocalMDXContent = (fileName: string) => {
  const filePath = getMDXFilePath(fileName);
  return fs.readFileSync(filePath, 'utf-8');
};

export const getLocalMDXMetaInfo = (fileName: string) => {
  const filePath = getMDXFilePath(fileName);
  // read meta info: like modified date, author, etc.
  // console.table(meta);
  return fs.statSync(filePath);
};

/**
 * Convert system date to human readable date
 * @param date - system date
 * @returns human readable date
 * @example
 * convertSystemToHumanDate(1716478929342.5315) // 2024. 5. 24. 오전 12:42:09
 */
export const convertSystemToHumanDate = (date: number) => {
  // return new Date(date).toDateString();
  return new Date(date).toLocaleString();
};
