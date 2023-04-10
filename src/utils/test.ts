import paralleTask, { ParalleTask } from "./task";

const createTast = (i) => {
  return new Promise<string>((resolve, reject) => {
    const a = Math.random() * 2000;
    setTimeout(() => {
      console.log(`${i}任务完成，耗时${a}`);
      if (i == 12) {
        reject("任务失败");
        console.log(`任务失败，耗时`);

        return 111;
      }
      resolve(`任务完成，耗时${a}`);
    }, a);
  });
};

const createTastList = () => {
  let list = [];
  for (let i = 0; i < 80; i++) {
    const task = () => createTast(i);
    list.push(task);
  }
  return list;
};
const lists = createTastList();
const paralleTask2 = new ParalleTask(lists);


paralleTask2.then((res) => {
    console.log("完成,", res);
  });
setTimeout(() => {
  console.log("停止任务");
  paralleTask2.stop();
  setTimeout(() => {
    console.log("继续任务");
    paralleTask2.run();
  }, 3000);
}, 8000);
