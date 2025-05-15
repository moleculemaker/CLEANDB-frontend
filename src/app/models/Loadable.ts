
export type LoadingStatus = 'loading' | 'loaded' | 'error' | 'na' | 'invalid';

export type Loadable<T> = {
  status: LoadingStatus;
  data: T | null;
};
