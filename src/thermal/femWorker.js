import { solveHeat, solveTransient } from './femSolver.js';

self.onmessage = ({ data }) => {
  const { type, nodes, elements, bbox, params } = data;
  try {
    if (type === 'steady') {
      const T = solveHeat(nodes, elements, bbox, params);
      self.postMessage({ type: 'done', T });
    } else {
      const r = solveTransient(nodes, elements, bbox, {
        ...params,
        onStep: (step) => {
          self.postMessage({ type: 'step', step });
        },
      });
      self.postMessage({ type: 'done', result: r });
    }
  } catch (err) {
    self.postMessage({ type: 'error', msg: String(err) });
  }
};
