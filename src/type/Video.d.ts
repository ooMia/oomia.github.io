// path: type/VideoFile
//  source: React.DetailedHTMLProps<React.SourceHTMLAttributes<HTMLSourceElement>, HTMLSourceElement>;

export type VideoFile = {
  // extends HTMLSourceElement
  src: string;
  type: string;
  height?: number;
  width?: number;
  media?: string;
}
