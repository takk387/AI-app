export class Langfuse {
  trace() {
    return {
      generation: () => ({ end: () => {}, update: () => {} }),
      span: () => ({ end: () => {} }),
      update: () => {},
    };
  }
  flushAsync() {
    return Promise.resolve();
  }
  shutdownAsync() {
    return Promise.resolve();
  }
}
