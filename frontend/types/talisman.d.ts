declare module "talisman/metrics/jaccard" {
  const jaccard: (a: ArrayLike<unknown>, b: ArrayLike<unknown>) => number;
  export default jaccard;
}

declare module "talisman/tokenizers/ngrams" {
  function ngrams<T = string>(n: number, sequence: string): string[];
  function ngrams<T>(n: number, sequence: T[]): T[][];
  export default ngrams;
}
