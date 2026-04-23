declare module "regression" {
  interface RegressionResult {
    equation: number[];
    r2: number;
    points: [number, number][];
    predict(x: number): [number, number];
  }
  function linear(data: [number, number][]): RegressionResult;
  function polynomial(data: [number, number][], options?: { order?: number }): RegressionResult;
  const regression: { linear: typeof linear; polynomial: typeof polynomial };
  export = regression;
}
