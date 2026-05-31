export type UserImage = {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  prompt?: string;
  source: 'current-result' | 'history-output' | 'history-input';
};
