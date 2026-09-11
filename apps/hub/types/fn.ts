/** Call signatures that keep parameter names out of consuming interfaces. */
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars -- rest args exist only to type the tuple
export type Fn<A extends unknown[], R = void> = (...args: A) => R;
