import { ReactNode } from 'react';

export default function RedText({ children }: { children: ReactNode }) {


  return <span style={{ color: 'red' }}>{children}</span>;

}
