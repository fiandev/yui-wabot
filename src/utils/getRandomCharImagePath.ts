import fs from "fs";
import _path from "path";

export function getRandomCharImagePath (): string {
  const paths = fs.readdirSync("./assets/images/chars"); 
  const path = paths[Math.floor(Math.random() * paths.length)];
  console.log(_path.join("./assets/images/chars", path))
  return _path.join("./assets/images/chars", path);
}