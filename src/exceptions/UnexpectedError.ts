
export default class UnexpectedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "UnexpectedError";
    }
}