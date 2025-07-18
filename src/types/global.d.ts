import FastDB from "../lib/FastDB"; // sesuaikan path-nya

declare global {
  namespace NodeJS {
    interface Global {
      db: FastDB;
      batchs: any[];
    }
  }

  // Ini agar "global.db" dikenali juga di luar konteks global
  var db: FastDB;
  var batchs: any[];
}

export {};
