// hand-written types for talisman's deep import paths, which ship no bundled .d.ts
declare module "talisman/metrics/jaccard" {
  const jaccard: (a: ArrayLike<unknown>, b: ArrayLike<unknown>) => number;
  export default jaccard;
}

declare module "talisman/tokenizers/ngrams" {
  // two overloads: string in, string[] (char grams), array in, array-of-arrays (token grams)
  function ngrams<T = string>(n: number, sequence: string): string[];
  function ngrams<T>(n: number, sequence: T[]): T[][];
  export default ngrams;
}
