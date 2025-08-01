import FastDB from "../lib/FastDB"; // sesuaikan path-nya

declare global {
  namespace NodeJS {
    interface Global {
      db: FastDB;
      batchs: any[];
      timestamp: number;
    }
  }

  // Ini agar "global.db" dikenali juga di luar konteks global
  var db: FastDB;
  var batchs: any[];
  var timestamp: number;
}

export { };
